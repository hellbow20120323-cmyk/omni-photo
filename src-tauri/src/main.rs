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

/// 处理进度信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressInfo {
    pub current: usize,
    pub total: usize,
    pub message: String,
    pub stats: ProcessingStats,
}

/// 处理统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStats {
    pub photos: usize,
    pub videos: usize,
    pub others: usize,
    pub duplicates: usize,
    pub errors: usize,
    pub processed: usize,
    /// 重复文件总大小（字节），实时累加并随进度事件推送
    pub total_duplicate_size: u64,
}

/// 前端传入的高级配置选项
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedOptions {
    /// 是否在目标目录中保留源目录的一级目录结构
    pub preserve_top_level_dir: bool,
    /// 自定义照片扩展名（全部小写、不含点）；为空或缺省时使用后端默认列表
    pub photo_extensions: Option<Vec<String>>,
    /// 自定义视频扩展名（全部小写、不含点）；为空或缺省时使用后端默认列表
    pub video_extensions: Option<Vec<String>>,
}

/// 处理任务状态
#[derive(Debug, Clone)]
struct TaskState {
    cancelled: bool,
}

type TaskStateHandle = Arc<Mutex<TaskState>>;

/// 扫描目录并返回文件列表
#[tauri::command]
async fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let dir_path = PathBuf::from(&path);
    
    if !dir_path.exists() {
        return Err("目录不存在".to_string());
    }

    if !dir_path.is_dir() {
        return Err("路径不是目录".to_string());
    }

    let mut files = Vec::new();
    scan_recursive(&dir_path, &mut files, None, None)?;

    Ok(files.iter().map(|p| p.to_string_lossy().to_string()).collect())
}

/// 递归扫描目录
/// * skip_dir_name: 若为 Some(name)，则跳过名为 name 的子目录（如收件箱中的 _Duplicates）
/// * skip_descend_into: 若为 Some(path)，则不再进入该路径或其子路径（归档库扫描时排除收件箱，从源头避免收件箱内文件被误判为重复）
fn scan_recursive(
    dir: &PathBuf,
    files: &mut Vec<PathBuf>,
    skip_dir_name: Option<&str>,
    skip_descend_into: Option<&PathBuf>,
) -> Result<(), String> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| format!("无法读取目录: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("无法读取目录项: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            // 跳过隐藏目录
            if path.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.starts_with('.'))
                .unwrap_or(false) {
                continue;
            }
            // 跳过指定名称的目录（如收件箱中的 _Duplicates）
            if let Some(name) = skip_dir_name {
                if path.file_name().and_then(|n| n.to_str()) == Some(name) {
                    continue;
                }
            }
            // 扫描归档库时：不进入收件箱目录（path == 收件箱 或 收件箱在该 path 下）
            if let Some(skip) = skip_descend_into {
                if path == *skip || skip.strip_prefix(&path).is_ok() {
                    continue;
                }
            }
            scan_recursive(&path, files, skip_dir_name, skip_descend_into)?;
        } else if path.is_file() {
            // 跳过隐藏文件
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

/// 检测收件箱与归档库是否重复或嵌套，若冲突则返回错误信息
fn check_path_conflict(source: &PathBuf, target: &PathBuf) -> Result<(), String> {
    let source_canon = std::fs::canonicalize(source).map_err(|e| format!("无法解析收件箱路径: {}", e))?;
    let target_canon = std::fs::canonicalize(target).map_err(|e| format!("无法解析归档库路径: {}", e))?;

    if source_canon == target_canon {
        return Err("收件箱与归档库不能为同一目录，请重新选择。".to_string());
    }
    if source_canon.strip_prefix(&target_canon).is_ok() {
        return Err("收件箱不能位于归档库内部，请将收件箱与归档库设为两个独立目录。".to_string());
    }
    if target_canon.strip_prefix(&source_canon).is_ok() {
        return Err("归档库不能位于收件箱内部，请将收件箱与归档库设为两个独立目录。".to_string());
    }
    Ok(())
}

/// 处理文件（仅复制，不删除源文件）
/// * compare_with_archive: true = 收件箱与归档库一起比较去重；false = 仅收件箱内比较去重
#[tauri::command]
async fn process_files(
    source_dir: String,
    target_dir: String,
    compare_with_archive: bool,
    advanced: Option<AdvancedOptions>,
    app_handle: tauri::AppHandle,
    state: State<'_, TaskStateHandle>,
) -> Result<ProcessingStats, String> {
    // 重置取消标志
    {
        let mut task_state = state.lock().unwrap();
        task_state.cancelled = false;
    }
    let source_path = PathBuf::from(&source_dir);
    let target_path = PathBuf::from(&target_dir);

    // 解析高级配置：是否保留一级目录、照片/视频扩展名列表
    let (preserve_top_level_dir, photo_exts, video_exts) = match advanced {
        Some(opts) => {
            // 归一化扩展名（去空、转小写）
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

    // 验证路径
    if !source_path.exists() {
        return Err("源目录不存在".to_string());
    }
    if !target_path.exists() {
        std::fs::create_dir_all(&target_path)
            .map_err(|e| format!("无法创建目标目录: {}", e))?;
    }

    // 冲突检测：收件箱与归档库不能相同或嵌套
    check_path_conflict(&source_path, &target_path)?;

    // #region agent log
    agent_log("main.rs:process_files", "process_files entered", "H2", None);
    // #endregion
    // 扫描收件箱文件（收件箱内的 _Duplicates 目录不参与比较和去重）
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

    // 重复仓库：目标目录下的 _Duplicates 文件夹
    let duplicates_dir = target_path.join("_Duplicates");
    std::fs::create_dir_all(&duplicates_dir)
        .map_err(|e| format!("无法创建重复仓库 _Duplicates: {}", e))?;

    // 已见过的哈希：仅用于判断重复；只有“首个”会进主归档并加入此集合，后续所有同哈希文件都移入 _Duplicates（不加入集合）
    let mut seen_hashes: HashSet<String> = HashSet::new();

    // 可选：与归档库一起比较去重。仅以正常归档目录（Photos/Videos/Others）参与比较，不包含 _Duplicates；扫描时直接不进入收件箱与 _Duplicates 目录
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

    // 处理每个文件
    for (idx, file_path) in files.iter().enumerate() {
        // 检查取消标志
        {
            let state = state.lock().unwrap();
            if state.cancelled {
                break;
            }
        }

        // 计算文件哈希
        let hash = match hasher::compute_file_hash(file_path) {
            Some(h) => h,
            None => {
                stats.errors += 1;
                send_progress(&app_handle, idx + 1, total, 
                    format!("跳过无法读取的文件: {}", file_path.display()), &stats);
                continue;
            }
        };

        // 检查重复：将重复文件复制到 _Duplicates（若同名已存在则文件名加时间戳）
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
                        format!("[重复项] 复制至 _Duplicates: {}", filename),
                        &stats,
                    );
                }
                Err(e) => {
                    stats.errors += 1;
                    send_progress(
                        &app_handle,
                        idx + 1,
                        total,
                        format!("重复文件复制失败: {} - {}", filename, e),
                        &stats,
                    );
                }
            }
            continue;
        }

        // 获取文件类型和日期（类型支持自定义扩展名）
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
                    format!("无法获取文件日期: {}", file_path.display()), &stats);
                continue;
            }
        };
        // 若日期来自文件名，输出到日志
        if let Some(ref msg) = date_source_msg {
            send_progress(&app_handle, idx + 1, total, msg.clone(), &stats);
        }

        // 更新统计
        match file_type {
            scanner::FileType::Photo => stats.photos += 1,
            scanner::FileType::Video => stats.videos += 1,
            scanner::FileType::Other => stats.others += 1,
        }

        // 构建目标路径：根据是否保留一级目录 & 根目录文件规则组织
        let type_dir = match file_type {
            scanner::FileType::Photo => "Photos",
            scanner::FileType::Video => "Videos",
            scanner::FileType::Other => "Others",
        };

        let year = date.format("%Y").to_string();
        let month = date.format("%m").to_string();
        let filename = file_path.file_name()
            .ok_or("无法获取文件名")?
            .to_string_lossy()
            .to_string();

        // 计算相对于收件箱的路径，用于判断是否为“根目录文件”以及提取一级目录名
        // 若 strip_prefix 失败（理论上不应发生），则退回使用完整路径
        let relative = file_path
            .strip_prefix(&source_path)
            .unwrap_or(file_path);

        // 根目录文件：相对路径只有一个组件（例如：IMG_0001.jpg）
        let mut components = relative.components();
        let first_component = components.next();
        let has_more = components.next().is_some();
        let is_root_file = first_component
            .as_ref()
            .map(|c| !has_more && matches!(c, std::path::Component::Normal(_)))
            .unwrap_or(false);

        // 非根文件时，可能的“一级目录名”
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

        // 组织目标路径：
        // 1. 根目录文件 → target/Inbox_Direct/类型/年/月/文件名
        // 2. 子目录文件 + 勾选保留一级目录 → target/<一级目录>/类型/年/月/文件名
        // 3. 其他情况保持现有：target/类型/年/月/文件名
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

        // 复制文件（不删除源文件）
        let result = scanner::copy_file(file_path, &dest_path);

        match result {
            Ok(_) => {
                seen_hashes.insert(hash);
                stats.processed += 1;
                let dest_subpath = format!("{}/{}/{}", type_dir, year, month);
                send_progress(&app_handle, idx + 1, total,
                    format!("已处理: {} → {}", filename, dest_subpath), &stats);
            }
            Err(e) => {
                stats.errors += 1;
                send_progress(&app_handle, idx + 1, total,
                    format!("处理失败: {} - {}", filename, e), &stats);
            }
        }
    }

    Ok(stats)
}

/// 发送进度更新事件
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

/// 递归统计目录下所有文件的总大小（字节）
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

/// 统计归档库下 _Duplicates 目录的总大小（字节），以 1024 为换算基数；目录不存在或为空则返回 0
#[tauri::command]
async fn get_duplicates_folder_size(target_dir: String) -> Result<u64, String> {
    let dup_path = PathBuf::from(&target_dir).join("_Duplicates");
    if !dup_path.exists() || !dup_path.is_dir() {
        return Ok(0);
    }
    dir_size_recursive(&dup_path).map_err(|e| format!("无法统计重复目录大小: {}", e))
}

/// 磁盘空间预检结果：收件箱总大小、归档盘剩余空间、是否足够
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSpaceCheck {
    /// 收件箱总大小（字节）
    pub source_size: u64,
    /// 归档库所在盘剩余空间（字节）
    pub available_on_target: u64,
    /// 剩余空间是否大于收件箱总大小
    pub sufficient: bool,
}

/// 在开始整理前检查：归档库所在盘的剩余空间是否大于收件箱总大小（复制会占用约等于收件箱大小的空间）
#[tauri::command]
async fn check_disk_space(source_dir: String, target_dir: String) -> Result<DiskSpaceCheck, String> {
    // #region agent log
    agent_log("main.rs:check_disk_space", "check_disk_space entered", "H1", None);
    // #endregion
    let source_path = PathBuf::from(&source_dir);
    let target_path = PathBuf::from(&target_dir);

    if !source_path.exists() || !source_path.is_dir() {
        return Err("收件箱路径不存在或不是目录".to_string());
    }
    if !target_path.exists() {
        return Err("归档库路径不存在".to_string());
    }

    let source_size = dir_size_recursive(&source_path).map_err(|e| format!("无法统计收件箱大小: {}", e))?;
    // #region agent log
    agent_log("main.rs:check_disk_space", "after dir_size_recursive", "H1", Some(serde_json::json!({ "source_size": source_size })));
    // #endregion
    let available_on_target = fs2::available_space(&target_path)
        .map_err(|e| format!("无法读取归档盘剩余空间: {}", e))?;

    let sufficient = available_on_target > source_size;

    Ok(DiskSpaceCheck {
        source_size,
        available_on_target,
        sufficient,
    })
}

/// 取消处理任务
#[tauri::command]
async fn cancel_task(state: State<'_, TaskStateHandle>) -> Result<(), String> {
    let mut task_state = state.lock().unwrap();
    task_state.cancelled = true;
    Ok(())
}

/// 将拖放路径解析为目录：若为目录则返回其规范路径，若为文件则返回其父目录的规范路径
#[tauri::command]
fn resolve_drop_path(path: String) -> Result<String, String> {
    use std::fs;
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("路径不存在".to_string());
    }
    let meta = fs::metadata(&p).map_err(|e| format!("无法读取路径: {}", e))?;
    let dir = if meta.is_dir() {
        p
    } else {
        p.parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| p.clone())
    };
    let canon = fs::canonicalize(&dir).map_err(|e| format!("无法解析目录: {}", e))?;
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
