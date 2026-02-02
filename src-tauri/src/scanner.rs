/// 照片扫描与处理逻辑
///
/// 功能：
/// - EXIF DateTimeOriginal 提取（图片）
/// - 文件名中的日期匹配（照片与视频通用）
/// - 文件创建时间 metadata.created()（macOS st_birthtime）
/// - 文件复制与跨平台路径处理
///
/// 严禁使用 accessed 或 modified 作为首选，拷贝会污染这些时间。
use std::fs;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, offset::TimeZone};
use exif::{In, Reader, Tag};
use regex::Regex;

/// 可能包含 EXIF 的图片扩展名（用于优先尝试 EXIF）
const EXIF_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "tiff", "tif", "heic", "heif", "raw", "arw", "dng", "webp"];

/// 日期解析结果：日期 + 可选日志消息（当日期来自文件名时填充）
pub type FileDateResult = Result<(DateTime<Local>, Option<String>), String>;

/// 获取文件的拍摄/创建时间
///
/// 优先级：
/// 1. EXIF DateTimeOriginal（仅对可能含 EXIF 的图片扩展名尝试）
/// 2. 文件名中的日期（YYYY-MM-DD / YYYY_MM_DD / YYYYMMDD，需校验合法性）
/// 3. 系统 metadata.created()（macOS st_birthtime）
///
/// 照片与视频扩展名均支持；不使用 accessed/modified。
pub fn get_file_date(file_path: &Path) -> FileDateResult {
    // 1. 对可能含 EXIF 的图片，优先尝试 EXIF DateTimeOriginal
    if has_exif_extension(file_path) {
        if let Ok(dt) = try_exif_datetime_original(file_path) {
            return Ok((dt, None));
        }
    }

    // 2. 从文件名匹配日期（照片、视频等通用）
    if let Some((dt, log_msg)) = try_date_from_filename(file_path) {
        return Ok((dt, Some(log_msg)));
    }

    // 3. 系统创建时间 metadata.created()
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("无法读取文件元数据: {}", e))?;

    let created = metadata
        .created()
        .map_err(|e| format!("无法获取文件创建时间(created/birthtime): {}", e))?;

    let duration = created
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "无法转换创建时间为时间戳".to_string())?;

    let dt = DateTime::from_timestamp(duration.as_secs() as i64, duration.subsec_nanos())
        .map(|d| d.with_timezone(&Local))
        .ok_or_else(|| "创建时间超出范围".to_string())?;
    Ok((dt, None))
}

/// 从文件名中匹配日期并校验合法性
/// 支持：YYYY-MM-DD、YYYY_MM_DD、YYYYMMDD（8 位数字，且前后为非数字或边界）
fn try_date_from_filename(file_path: &Path) -> Option<(DateTime<Local>, String)> {
    let name = file_path.file_name()?.to_str()?;

    // 模式 1：YYYY-MM-DD 或 YYYY_MM_DD
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
            return Some((dt, format!("从文件名解析到日期: {}", label)));
        }
    }

    // 模式 2：YYYYMMDD（8 位连续数字，且前后为非数字或边界）
    let re_compact = Regex::new(r"(\d{4})(\d{2})(\d{2})").ok()?;
    for caps in re_compact.captures_iter(name) {
        let (y, m, d) = (
            caps.get(1)?.as_str().parse::<i32>().ok()?,
            caps.get(2)?.as_str().parse::<u32>().ok()?,
            caps.get(3)?.as_str().parse::<u32>().ok()?,
        );
        // 确保是“独立”的 8 位：匹配起始前为非数字或字符串起始，匹配结束为非数字或字符串结束
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
            return Some((dt, format!("从文件名解析到日期: {}", label)));
        }
    }

    None
}

/// 校验并构造合法 NaiveDate（月份 1–12，日期在当月有效范围内）
fn valid_naive_date(year: i32, month: u32, day: u32) -> Option<NaiveDate> {
    if !(1..=12).contains(&month) {
        return None;
    }
    NaiveDate::from_ymd_opt(year, month, day)
}

/// 判断扩展名是否可能包含 EXIF
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

/// 从图片 EXIF 读取 DateTimeOriginal，失败时返回 Err（不 panic）
fn try_exif_datetime_original(file_path: &Path) -> Result<DateTime<Local>, String> {
    let file = fs::File::open(file_path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut buf = BufReader::new(file);

    let exif = Reader::new()
        .read_from_container(&mut buf)
        .map_err(|e| format!("EXIF 解析失败: {}", e))?;

    let field = exif
        .get_field(Tag::DateTimeOriginal, In::PRIMARY)
        .ok_or("无 EXIF DateTimeOriginal")?;

    // EXIF 日期格式: "YYYY:MM:DD HH:MM:SS" (ASCII)
    let s = match &field.value {
        exif::Value::Ascii(ref segments) => {
            segments
                .first()
                .and_then(|seg| std::str::from_utf8(seg).ok())
                .map(|s| s.trim_matches('\0').trim())
                .ok_or("EXIF DateTimeOriginal 格式无效")?
        }
        _ => return Err("EXIF DateTimeOriginal 类型不是 ASCII".to_string()),
    };

    let naive = NaiveDateTime::parse_from_str(s, "%Y:%m:%d %H:%M:%S")
        .map_err(|e| format!("EXIF 日期解析失败: {}", e))?;

    Local
        .from_local_datetime(&naive)
        .single()
        .ok_or_else(|| "EXIF 日期无法转换为本地时间".to_string())
}

/// 文件类型枚举
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FileType {
    Photo,
    Video,
    Other,
}

/// 判断文件类型
pub fn get_file_type(file_path: &Path) -> FileType {
    let ext = file_path.extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "tiff" | "heic" | "raw" | "arw" => FileType::Photo,
        "mp4" | "mov" | "avi" | "mkv" => FileType::Video,
        _ => FileType::Other,
    }
}

/// 生成唯一的目标路径（如果文件已存在，添加时间戳）
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

    // 添加时间戳
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

/// 复制文件到目标位置
pub fn copy_file(source: &Path, target: &Path) -> Result<(), String> {
    // 确保目标目录存在
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("无法创建目标目录: {}", e))?;
    }

    // 获取唯一路径
    let unique_target = get_unique_path(target);

    // 复制文件（保留元数据）
    fs::copy(source, &unique_target)
        .map_err(|e| format!("无法复制文件: {}", e))?;

    Ok(())
}
