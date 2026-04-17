// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod hasher;
mod scanner;

use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use serde::{Deserialize, Serialize};

// #region agent log
fn agent_log(location: &str, message: &str, hypothesis_id: &str, data: Option<serde_json::Value>) {
    let payload = serde_json::json!({
        "location": location,
        "message": message,
        "data": data,
        "timestamp": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0),
        "sessionId": "debug-session",
        "hypothesisId": hypothesis_id
    });
    let path = std::env::current_dir().ok().map(|p| p.join(".cursor").join("debug.log")).unwrap_or_else(|| PathBuf::from(".cursor/debug.log"));
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "{}", payload);
    }
}
// #endregion

/// Progress payload for the UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressInfo {
    pub current: usize,
    pub total: usize,
    pub message: String,
    pub stats: ProcessingStats,
}

/// Aggregated counts during a run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStats {
    pub photos: usize,
    pub videos: usize,
    pub others: usize,
    pub duplicates: usize,
    pub errors: usize,
    pub processed: usize,
    /// Total bytes in _Duplicates (updated as duplicates are copied).
    pub total_duplicate_size: u64,
}

/// Advanced options from the frontend.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedOptions {
    /// Keep one top-level folder from the source tree in the archive.
    pub preserve_top_level_dir: bool,
    /// Photo extensions (lowercase, no dot); omit for built-in defaults.
    pub photo_extensions: Option<Vec<String>>,
    /// Video extensions (lowercase, no dot); omit for built-in defaults.
    pub video_extensions: Option<Vec<String>>,
}

/// Cancellation flag for the current job.
#[derive(Debug, Clone)]
struct TaskState {
    cancelled: bool,
}

type TaskStateHandle = Arc<Mutex<TaskState>>;

/// List all files under a directory (recursive).
#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let dir_path = PathBuf::from(&path);
    
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut files = Vec::new();
    scan_recursive(&dir_path, &mut files, None, None)?;

    Ok(files.iter().map(|p| p.to_string_lossy().to_string()).collect())
}

/// Recursive directory walk.
/// * skip_dir_name: skip subdirs with this name (e.g. `_Duplicates` in inbox).
/// * skip_descend_into: do not descend into this path (excludes inbox when scanning archive).
fn scan_recursive(
    dir: &PathBuf,
    files: &mut Vec<PathBuf>,
    skip_dir_name: Option<&str>,
    skip_descend_into: Option<&PathBuf>,
) -> Result<(), String> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| format!("Cannot read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Cannot read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            // Skip hidden directories (跳过隐藏目录)
            if path.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.starts_with('.'))
                .unwrap_or(false) {
                continue;
            }
            // Skip directories with this basename (e.g. inbox `_Duplicates`) (跳过指定名称目录)
            if let Some(name) = skip_dir_name {
                if path.file_name().and_then(|n| n.to_str()) == Some(name) {
                    continue;
                }
            }
            // When scanning archive: do not descend into inbox (`path == inbox` or inbox under `path`) (扫描归档库时不进入收件箱)
            if let Some(skip) = skip_descend_into {
                if path == *skip || skip.strip_prefix(&path).is_ok() {
                    continue;
                }
            }
            scan_recursive(&path, files, skip_dir_name, skip_descend_into)?;
        } else if path.is_file() {
            // Skip hidden files (跳过隐藏文件)
            if path.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.starts_with('.'))
                .unwrap_or(false) {
                continue;
            }
            files.push(path);
        }
    }

    Ok(())
}

/// Reject if inbox and archive are the same or nested.
fn check_path_conflict(source: &PathBuf, target: &PathBuf) -> Result<(), String> {
    let source_canon = std::fs::canonicalize(source).map_err(|e| format!("Cannot resolve inbox path: {}", e))?;
    let target_canon = std::fs::canonicalize(target).map_err(|e| format!("Cannot resolve archive path: {}", e))?;

    if source_canon == target_canon {
        return Err("Inbox and archive cannot be the same folder. Choose two different folders.".to_string());
    }
    if source_canon.strip_prefix(&target_canon).is_ok() {
        return Err("Inbox cannot be inside the archive. Use two separate folders.".to_string());
    }
    if target_canon.strip_prefix(&source_canon).is_ok() {
        return Err("Archive cannot be inside the inbox. Use two separate folders.".to_string());
    }
    Ok(())
}

/// Copy files into archive layout; never delete sources.
/// * compare_with_archive: if true, dedupe against existing archive content too.
#[tauri::command]
async fn process_files(
    source_dir: String,
    target_dir: String,
    compare_with_archive: bool,
    advanced: Option<AdvancedOptions>,
    app_handle: tauri::AppHandle,
    state: State<'_, TaskStateHandle>,
) -> Result<ProcessingStats, String> {
    // Reset cancellation flag (重置取消标志)
    {
        let mut task_state = state.lock().unwrap();
        task_state.cancelled = false;
    }
    let source_path = PathBuf::from(&source_dir);
    let target_path = PathBuf::from(&target_dir);

    // Advanced options: preserve top-level folder, photo/video extension lists (高级配置)
    let (preserve_top_level_dir, photo_exts, video_exts) = match advanced {
        Some(opts) => {
            // Normalize extensions: trim, lowercase (归一化扩展名)
            let photo_exts = opts.photo_extensions.map(|list| {
                list.into_iter()
                    .map(|s| s.trim().to_lowercase())
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
            });
            let video_exts = opts.video_extensions.map(|list| {
                list.into_iter()
                    .map(|s| s.trim().to_lowercase())
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
            });
            (opts.preserve_top_level_dir, photo_exts, video_exts)
        }
        None => (false, None, None),
    };

    // Validate paths (验证路径)
    if !source_path.exists() {
        return Err("Source directory does not exist".to_string());
    }
    if !target_path.exists() {
        std::fs::create_dir_all(&target_path)
            .map_err(|e| format!("Cannot create target directory: {}", e))?;
    }

    // Inbox vs archive must differ and not nest (冲突检测)
    check_path_conflict(&source_path, &target_path)?;

    // #region agent log
    agent_log("main.rs:process_files", "process_files entered", "H2", None);
    // #endregion
    // List inbox files; `_Duplicates` under inbox is skipped (扫描收件箱，排除 _Duplicates)
    let mut files = Vec::new();
    scan_recursive(&source_path, &mut files, Some("_Duplicates"), None)?;
    let total = files.len();
    // #region agent log
    agent_log("main.rs:process_files", "after scan_recursive inbox", "H2", Some(serde_json::json!({ "files_count": total })));
    // #endregion

    if total == 0 {
        return Ok(ProcessingStats {
            photos: 0,
            videos: 0,
            others: 0,
            duplicates: 0,
            errors: 0,
            processed: 0,
            total_duplicate_size: 0,
        });
    }

    // Duplicate bucket: `_Duplicates` under target (重复文件目录)
    let duplicates_dir = target_path.join("_Duplicates");
    std::fs::create_dir_all(&duplicates_dir)
        .map_err(|e| format!("Cannot create _Duplicates folder: {}", e))?;

    // Seen hashes: first file wins main archive; later same-hash copies go to `_Duplicates` (已见哈希集合)
    let mut seen_hashes: HashSet<String> = HashSet::new();

    // Optional: seed hashes from archive (Photos/Videos/Others only; skip inbox & `_Duplicates`) (与归档库比对去重)
    if compare_with_archive {
        let source_canon = std::fs::canonicalize(&source_path).unwrap_or_else(|_| source_path.clone());
        let mut archive_files = Vec::new();
        if let Ok(()) = scan_recursive(&target_path, &mut archive_files, Some("_Duplicates"), Some(&source_canon)) {
            // #region agent log
            agent_log("main.rs:process_files", "archive scan done, hashing", "H3", Some(serde_json::json!({ "archive_files_count": archive_files.len() })));
            // #endregion
            for path in &archive_files {
                if let Some(h) = hasher::compute_file_hash(path) {
                    seen_hashes.insert(h);
                }
            }
            // #region agent log
            agent_log("main.rs:process_files", "after compare_with_archive hashing", "H3", Some(serde_json::json!({ "seen_hashes": seen_hashes.len() })));
            // #endregion
        }
    }

    let mut stats = ProcessingStats {
        photos: 0,
        videos: 0,
        others: 0,
        duplicates: 0,
        errors: 0,
        processed: 0,
        total_duplicate_size: 0,
    };

    // Process each file (处理每个文件)
    for (idx, file_path) in files.iter().enumerate() {
        // Cancellation check (检查取消标志)
        {
            let state = state.lock().unwrap();
            if state.cancelled {
                break;
            }
        }

        // File hash (计算文件哈希)
        let hash = match hasher::compute_file_hash(file_path) {
            Some(h) => h,
            None => {
                stats.errors += 1;
                send_progress(&app_handle, idx + 1, total, 
                    format!("Skipped unreadable file: {}", file_path.display()), &stats);
                continue;
            }
        };

        // Duplicate: copy to `_Duplicates` (timestamp if name exists) (重复文件处理)
        if seen_hashes.contains(&hash) {
            let filename = file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string());
            let dup_path = duplicates_dir.join(&filename);

            let file_size = std::fs::metadata(file_path).ok().map(|m| m.len()).unwrap_or(0);

            match scanner::copy_file(file_path, &dup_path) {
                Ok(_) => {
                    stats.duplicates += 1;
                    stats.total_duplicate_size += file_size;
                    send_progress(
                        &app_handle,
                        idx + 1,
                        total,
                        format!("[Duplicate] Copied to _Duplicates: {}", filename),
                        &stats,
                    );
                }
                Err(e) => {
                    stats.errors += 1;
                    send_progress(
                        &app_handle,
                        idx + 1,
                        total,
                        format!("Duplicate copy failed: {} - {}", filename, e),
                        &stats,
                    );
                }
            }
            continue;
        }

        // File type & date (custom extensions for type) (类型与日期)
        let file_type = scanner::get_file_type_with_exts(
            file_path,
            photo_exts.as_deref(),
            video_exts.as_deref(),
        );
        let (date, date_source_msg) = match scanner::get_file_date(file_path) {
            Ok((d, msg)) => (d, msg),
            Err(_) => {
                stats.errors += 1;
                send_progress(&app_handle, idx + 1, total,
                    format!("Could not read file date: {}", file_path.display()), &stats);
                continue;
            }
        };
        // Log when date was parsed from filename (日期来自文件名时记录)
        if let Some(ref msg) = date_source_msg {
            send_progress(&app_handle, idx + 1, total, msg.clone(), &stats);
        }

        // Update counters (更新统计)
        match file_type {
            scanner::FileType::Photo => stats.photos += 1,
            scanner::FileType::Video => stats.videos += 1,
            scanner::FileType::Other => stats.others += 1,
        }

        // Destination path: top-level preserve + root-file rules (目标路径规则)
        let type_dir = match file_type {
            scanner::FileType::Photo => "Photos",
            scanner::FileType::Video => "Videos",
            scanner::FileType::Other => "Others",
        };

        let year = date.format("%Y").to_string();
        let month = date.format("%m").to_string();
        let filename = file_path.file_name()
            .ok_or("Could not get file name")?
            .to_string_lossy()
            .to_string();

        // Path relative to inbox: detect root file & top-level folder name (相对收件箱路径)
        // If strip_prefix fails (should not), fall back to full path
        let relative = file_path
            .strip_prefix(&source_path)
            .unwrap_or(file_path);

        // Root file: single path component (e.g. IMG_0001.jpg) (根目录文件)
        let mut components = relative.components();
        let first_component = components.next();
        let has_more = components.next().is_some();
        let is_root_file = first_component
            .as_ref()
            .map(|c| !has_more && matches!(c, std::path::Component::Normal(_)))
            .unwrap_or(false);

        // For non-root files: first path component as top-level folder (一级目录名)
        let top_level_dir_name = if is_root_file {
            None
        } else {
            match first_component {
                Some(std::path::Component::Normal(os_str)) => {
                    Some(os_str.to_string_lossy().to_string())
                }
                _ => None,
            }
        };

        // Layout: (目标路径组织)
        // 1. Root file → target/Inbox_Direct/<type>/Y/M/file
        // 2. Subfolder + preserve top-level → target/<folder>/<type>/Y/M/file
        // 3. Else → target/<type>/Y/M/file
        let dest_path = if is_root_file {
            target_path
                .join("Inbox_Direct")
                .join(type_dir)
                .join(&year)
                .join(&month)
                .join(&filename)
        } else if preserve_top_level_dir {
            if let Some(ref top) = top_level_dir_name {
                target_path
                    .join(top)
                    .join(type_dir)
                    .join(&year)
                    .join(&month)
                    .join(&filename)
            } else {
                target_path
                    .join(type_dir)
                    .join(&year)
                    .join(&month)
                    .join(&filename)
            }
        } else {
            target_path
                .join(type_dir)
                .join(&year)
                .join(&month)
                .join(&filename)
        };

        // Copy only; do not delete source (复制，不删源)
        let result = scanner::copy_file(file_path, &dest_path);

        match result {
            Ok(_) => {
                seen_hashes.insert(hash);
                stats.processed += 1;
                let dest_subpath = format!("{}/{}/{}", type_dir, year, month);
                send_progress(&app_handle, idx + 1, total,
                    format!("Processed: {} → {}", filename, dest_subpath), &stats);
            }
            Err(e) => {
                stats.errors += 1;
                send_progress(&app_handle, idx + 1, total,
                    format!("Failed: {} - {}", filename, e), &stats);
            }
        }
    }

    Ok(stats)
}

/// Emit progress to the frontend.
fn send_progress(
    app_handle: &tauri::AppHandle,
    current: usize,
    total: usize,
    message: String,
    stats: &ProcessingStats,
) {
    let progress = ProgressInfo {
        current,
        total,
        message,
        stats: stats.clone(),
    };

    app_handle.emit_all("progress", &progress).ok();
}

/// Total file size under a directory (recursive).
fn dir_size_recursive(path: &Path) -> std::io::Result<u64> {
    let mut total: u64 = 0;
    let entries = std::fs::read_dir(path)?;
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            total += dir_size_recursive(&path)?;
        } else if path.is_file() {
            total += entry.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }
    Ok(total)
}

/// Total size of `_Duplicates` under archive (bytes); base-1024 display in UI. Returns 0 if missing/empty. (统计 _Duplicates 大小)
#[tauri::command]
async fn get_duplicates_folder_size(target_dir: String) -> Result<u64, String> {
    let dup_path = PathBuf::from(&target_dir).join("_Duplicates");
    if !dup_path.exists() || !dup_path.is_dir() {
        return Ok(0);
    }
    dir_size_recursive(&dup_path).map_err(|e| format!("Could not measure _Duplicates size: {}", e))
}

/// Disk check: inbox bytes vs free space on archive volume.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSpaceCheck {
    /// Total bytes in inbox tree.
    pub source_size: u64,
    /// Free bytes on volume containing archive.
    pub available_on_target: u64,
    /// True if free space > inbox size.
    pub sufficient: bool,
}

/// Before run: ensure archive volume has more free space than inbox size.
#[tauri::command]
async fn check_disk_space(source_dir: String, target_dir: String) -> Result<DiskSpaceCheck, String> {
    // #region agent log
    agent_log("main.rs:check_disk_space", "check_disk_space entered", "H1", None);
    // #endregion
    let source_path = PathBuf::from(&source_dir);
    let target_path = PathBuf::from(&target_dir);

    if !source_path.exists() || !source_path.is_dir() {
        return Err("Inbox path is missing or not a directory".to_string());
    }
    if !target_path.exists() {
        return Err("Archive path does not exist".to_string());
    }

    let source_size = dir_size_recursive(&source_path).map_err(|e| format!("Could not measure inbox size: {}", e))?;
    // #region agent log
    agent_log("main.rs:check_disk_space", "after dir_size_recursive", "H1", Some(serde_json::json!({ "source_size": source_size })));
    // #endregion
    let available_on_target = fs2::available_space(&target_path)
        .map_err(|e| format!("Could not read free space on archive volume: {}", e))?;

    let sufficient = available_on_target > source_size;

    Ok(DiskSpaceCheck {
        source_size,
        available_on_target,
        sufficient,
    })
}

/// Request cooperative cancel.
#[tauri::command]
async fn cancel_task(state: State<'_, TaskStateHandle>) -> Result<(), String> {
    let mut task_state = state.lock().unwrap();
    task_state.cancelled = true;
    Ok(())
}

/// Resolve drop target to a directory (file → parent).
#[tauri::command]
fn resolve_drop_path(path: String) -> Result<String, String> {
    use std::fs;
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("Path does not exist".to_string());
    }
    let meta = fs::metadata(&p).map_err(|e| format!("Cannot read path: {}", e))?;
    let dir = if meta.is_dir() {
        p
    } else {
        p.parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| p.clone())
    };
    let canon = fs::canonicalize(&dir).map_err(|e| format!("Cannot resolve directory: {}", e))?;
    Ok(canon.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(TaskState { cancelled: false })))
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            process_files,
            get_duplicates_folder_size,
            check_disk_space,
            cancel_task,
            resolve_drop_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
