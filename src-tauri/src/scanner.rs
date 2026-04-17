/// Photo scan helpers (dates, copy).
///
/// Features:
/// - EXIF DateTimeOriginal (images)
/// - Date patterns in filenames (photos & videos)
/// - `metadata.created()` / birthtime
/// - File copy helpers
///
/// Do not prefer atime/mtime; copying skews them.
use std::fs;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, offset::TimeZone};
use exif::{In, Reader, Tag};
use regex::Regex;

/// Extensions we try EXIF on first.
const EXIF_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "tiff", "tif", "heic", "heif", "raw", "arw", "dng", "webp"];

/// Default photo extensions.
const DEFAULT_PHOTO_EXTS: &[&str] = &["jpg", "jpeg", "png", "tiff", "heic", "raw", "arw"];

/// Default video extensions.
const DEFAULT_VIDEO_EXTS: &[&str] = &["mp4", "mov", "avi", "mkv"];

/// Parsed date + optional log line when from filename.
pub type FileDateResult = Result<(DateTime<Local>, Option<String>), String>;

/// Best-effort capture / creation time.
///
/// Order:
/// 1. EXIF DateTimeOriginal when extension may carry EXIF
/// 2. Filename date patterns (validated)
/// 3. `metadata.created()`
///
/// Same pipeline for photos/videos; no atime/mtime.
pub fn get_file_date(file_path: &Path) -> FileDateResult {
    // 1. EXIF DateTimeOriginal when extension may carry EXIF (优先 EXIF)
    if has_exif_extension(file_path) {
        if let Ok(dt) = try_exif_datetime_original(file_path) {
            return Ok((dt, None));
        }
    }

    // 2. Filename date patterns (photos/videos) (文件名日期)
    if let Some((dt, log_msg)) = try_date_from_filename(file_path) {
        return Ok((dt, Some(log_msg)));
    }

    // 3. `metadata.created()` (系统创建时间)
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Cannot read file metadata: {}", e))?;

    let created = metadata
        .created()
        .map_err(|e| format!("Cannot read file creation time: {}", e))?;

    let duration = created
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "Cannot convert creation time to timestamp".to_string())?;

    let dt = DateTime::from_timestamp(duration.as_secs() as i64, duration.subsec_nanos())
        .map(|d| d.with_timezone(&Local))
        .ok_or_else(|| "Creation time out of range".to_string())?;
    Ok((dt, None))
}

/// Parse date from filename with validation.
/// Supports YYYY-MM-DD, YYYY_MM_DD, YYYYMMDD (bounded digits).
fn try_date_from_filename(file_path: &Path) -> Option<(DateTime<Local>, String)> {
    let name = file_path.file_name()?.to_str()?;

    // Pattern 1: YYYY-MM-DD or YYYY_MM_DD (模式 1)
    let re_sep = Regex::new(r"(\d{4})[-_](\d{2})[-_](\d{2})").ok()?;
    if let Some(caps) = re_sep.captures(name) {
        let (y, m, d) = (
            caps.get(1)?.as_str().parse::<i32>().ok()?,
            caps.get(2)?.as_str().parse::<u32>().ok()?,
            caps.get(3)?.as_str().parse::<u32>().ok()?,
        );
        if let Some(naive) = valid_naive_date(y, m, d) {
            let ndt = naive.and_hms_opt(0, 0, 0)?;
            let dt = Local.from_local_datetime(&ndt).single()?;
            let label = format!("{:04}-{:02}-{:02}", y, m, d);
            return Some((dt, format!("Date from filename: {}", label)));
        }
    }

    // Pattern 2: YYYYMMDD (8 digits; bounded by non-digits) (模式 2)
    let re_compact = Regex::new(r"(\d{4})(\d{2})(\d{2})").ok()?;
    for caps in re_compact.captures_iter(name) {
        let (y, m, d) = (
            caps.get(1)?.as_str().parse::<i32>().ok()?,
            caps.get(2)?.as_str().parse::<u32>().ok()?,
            caps.get(3)?.as_str().parse::<u32>().ok()?,
        );
        // Ensure standalone 8-digit run: non-digit or boundary before/after (独立8 位)
        let full = caps.get(0)?;
        let start = full.start();
        let end = full.end();
        let pred_ok = start == 0 || name[..start].chars().next_back().map(|c| !c.is_ascii_digit()).unwrap_or(true);
        let succ_ok = end == name.len() || name[end..].chars().next().map(|c| !c.is_ascii_digit()).unwrap_or(true);
        if !pred_ok || !succ_ok {
            continue;
        }
        if let Some(naive) = valid_naive_date(y, m, d) {
            let ndt = naive.and_hms_opt(0, 0, 0)?;
            let dt = Local.from_local_datetime(&ndt).single()?;
            let label = format!("{:04}-{:02}-{:02}", y, m, d);
            return Some((dt, format!("Date from filename: {}", label)));
        }
    }

    None
}

/// Build `NaiveDate` if month/day valid.
fn valid_naive_date(year: i32, month: u32, day: u32) -> Option<NaiveDate> {
    if !(1..=12).contains(&month) {
        return None;
    }
    NaiveDate::from_ymd_opt(year, month, day)
}

/// Whether we attempt EXIF for this extension.
fn has_exif_extension(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase());
    match ext.as_ref().map(|s| s.as_str()) {
        Some(ext) => EXIF_EXTENSIONS.contains(&ext),
        None => false,
    }
}

/// Read EXIF DateTimeOriginal; returns Err on failure.
fn try_exif_datetime_original(file_path: &Path) -> Result<DateTime<Local>, String> {
    let file = fs::File::open(file_path).map_err(|e| format!("Cannot open file: {}", e))?;
    let mut buf = BufReader::new(file);

    let exif = Reader::new()
        .read_from_container(&mut buf)
        .map_err(|e| format!("EXIF parse failed: {}", e))?;

    let field = exif
        .get_field(Tag::DateTimeOriginal, In::PRIMARY)
        .ok_or("No EXIF DateTimeOriginal")?;

    // EXIF date string: "YYYY:MM:DD HH:MM:SS" (ASCII) (EXIF 日期格式)
    let s = match &field.value {
        exif::Value::Ascii(ref segments) => {
            segments
                .first()
                .and_then(|seg| std::str::from_utf8(seg).ok())
                .map(|s| s.trim_matches('\0').trim())
                .ok_or("Invalid EXIF DateTimeOriginal format")?
        }
        _ => return Err("EXIF DateTimeOriginal is not ASCII".to_string()),
    };

    let naive = NaiveDateTime::parse_from_str(s, "%Y:%m:%d %H:%M:%S")
        .map_err(|e| format!("EXIF date parse failed: {}", e))?;

    Local
        .from_local_datetime(&naive)
        .single()
        .ok_or_else(|| "EXIF date could not convert to local time".to_string())
}

/// File category for sorting.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FileType {
    Photo,
    Video,
    Other,
}

/// Classify file; optional extension lists.
pub fn get_file_type_with_exts(
    file_path: &Path,
    photo_exts: Option<&[String]>,
    video_exts: Option<&[String]>,
) -> FileType {
    let ext = file_path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if ext.is_empty() {
        return FileType::Other;
    }

    // Prefer user-provided extension lists when set
    let is_photo = if let Some(custom) = photo_exts {
        if !custom.is_empty() {
            custom.iter().any(|e| e.eq_ignore_ascii_case(&ext))
        } else {
            false
        }
    } else {
        DEFAULT_PHOTO_EXTS.contains(&ext.as_str())
    };

    if is_photo {
        return FileType::Photo;
    }

    let is_video = if let Some(custom) = video_exts {
        if !custom.is_empty() {
            custom.iter().any(|e| e.eq_ignore_ascii_case(&ext))
        } else {
            false
        }
    } else {
        DEFAULT_VIDEO_EXTS.contains(&ext.as_str())
    };

    if is_video {
        FileType::Video
    } else {
        FileType::Other
    }
}

/// Unique destination path (timestamp suffix if name exists).
pub fn get_unique_path(target_path: &Path) -> PathBuf {
    if !target_path.exists() {
        return target_path.to_path_buf();
    }

    let stem = target_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let extension = target_path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let parent = target_path.parent().unwrap_or(Path::new("."));

    // Timestamp suffix
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let mut counter = 1;
    loop {
        let new_name = if extension.is_empty() {
            format!("{}_{}_{}", stem, timestamp, counter)
        } else {
            format!("{}_{}_{}.{}", stem, timestamp, counter, extension)
        };
        
        let new_path = parent.join(&new_name);
        if !new_path.exists() {
            return new_path;
        }
        counter += 1;
    }
}

/// Copy file to destination (creates parent dirs).
pub fn copy_file(source: &Path, target: &Path) -> Result<(), String> {
    // Ensure parent exists
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Cannot create target directory: {}", e))?;
    }

    // Resolve name clash
    let unique_target = get_unique_path(target);

    // Copy (metadata preserved per platform)
    fs::copy(source, &unique_target)
        .map_err(|e| format!("Cannot copy file: {}", e))?;

    Ok(())
}
