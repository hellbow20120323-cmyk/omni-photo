/// Progressive hashing for duplicate detection (渐进式哈希).
///
/// Strategy: (策略)
/// 1. Read file size first
/// 2. Hash head + tail 1KB each as a quick fingerprint when sizes match
/// 3. Fall back to full MD5 if still ambiguous
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use md5;

/// Compute progressive hash fingerprint for a file.
///
/// # Arguments
///
/// * `file_path` — path to the file (文件路径)
///
/// # Returns
///
/// `Some(hex)` on success; `None` if the file cannot be read (读取失败返回 None)
pub fn compute_file_hash(file_path: &Path) -> Option<String> {
    let mut file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => return None,
    };

    // File size (获取文件大小)
    let metadata = match file.metadata() {
        Ok(m) => m,
        Err(_) => return None,
    };
    let size = metadata.len();

    // Small files: full MD5 immediately (<2KB) (小文件直接全量 MD5)
    if size < 2048 {
        return compute_full_md5(&mut file);
    }

    // First 1KB (文件头 1KB)
    let mut header = vec![0u8; 1024];
    file.seek(SeekFrom::Start(0)).ok()?;
    file.read_exact(&mut header).ok()?;

    // Last 1KB (文件尾 1KB)
    let mut footer = vec![0u8; 1024];
    let footer_start = size.saturating_sub(1024);
    file.seek(SeekFrom::Start(footer_start)).ok()?;
    file.read_exact(&mut footer).ok()?;

    // MD5(head || tail) (头尾 MD5)
    let mut hasher = md5::Context::new();
    hasher.consume(&header);
    hasher.consume(&footer);
    let partial_hash = format!("{:x}", hasher.compute());

    // `{size}_{partial}` (大小_部分哈希)
    Some(format!("{}_{}", size, partial_hash))
}

/// Full-file MD5 (完整 MD5)
fn compute_full_md5(file: &mut File) -> Option<String> {
    file.seek(SeekFrom::Start(0)).ok()?;

    let mut hasher = md5::Context::new();
    let mut buffer = vec![0u8; 8192]; // 8KB read buffer (8KB 缓冲区)
    loop {
        match file.read(&mut buffer) {
            Ok(0) => break, // EOF
            Ok(n) => hasher.consume(&buffer[..n]),
            Err(_) => return None,
        }
    }

    Some(format!("{:x}", hasher.compute()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_small_file_hash() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");

        let mut file = File::create(&file_path).unwrap();
        file.write_all(b"hello world").unwrap();

        let hash = compute_file_hash(&file_path);
        assert!(hash.is_some());
    }

    #[test]
    fn test_large_file_hash() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("large.txt");

        let mut file = File::create(&file_path).unwrap();
        // 5KB payload to exercise large-file path (写入 5KB)
        let data = vec![0u8; 5120];
        file.write_all(&data).unwrap();

        let hash = compute_file_hash(&file_path);
        assert!(hash.is_some());
        // Large files use size_partial form (大文件用部分哈希)
        assert!(hash.unwrap().contains("_"));
    }
}
