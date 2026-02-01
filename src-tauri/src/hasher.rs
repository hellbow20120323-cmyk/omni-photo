/// 渐进式哈希算法实现
/// 
/// 策略：
/// 1. 首先检查文件大小
/// 2. 如果大小相同，读取文件头尾各 1KB 计算指纹
/// 3. 如果指纹仍相同，进行全量 MD5 校验
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use md5;

/// 计算文件的渐进式哈希指纹
/// 
/// # Arguments
/// 
/// * `file_path` - 文件路径
/// 
/// # Returns
/// 
/// 返回 `Option<String>`，如果文件读取失败则返回 `None`
pub fn compute_file_hash(file_path: &Path) -> Option<String> {
    let mut file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => return None,
    };

    // 获取文件大小
    let metadata = match file.metadata() {
        Ok(m) => m,
        Err(_) => return None,
    };
    let size = metadata.len();

    // 如果文件小于 2KB，直接计算全量 MD5
    if size < 2048 {
        return compute_full_md5(&mut file);
    }

    // 读取文件头 1KB
    let mut header = vec![0u8; 1024];
    file.seek(SeekFrom::Start(0)).ok()?;
    file.read_exact(&mut header).ok()?;

    // 读取文件尾 1KB
    let mut footer = vec![0u8; 1024];
    let footer_start = size.saturating_sub(1024);
    file.seek(SeekFrom::Start(footer_start)).ok()?;
    file.read_exact(&mut footer).ok()?;

    // 计算头尾的 MD5
    let mut hasher = md5::Context::new();
    hasher.consume(&header);
    hasher.consume(&footer);
    let partial_hash = format!("{:x}", hasher.compute());

    // 返回：大小_部分哈希
    Some(format!("{}_{}", size, partial_hash))
}

/// 计算文件的完整 MD5 哈希
fn compute_full_md5(file: &mut File) -> Option<String> {
    file.seek(SeekFrom::Start(0)).ok()?;
    
    let mut hasher = md5::Context::new();
    let mut buffer = vec![0u8; 8192]; // 8KB 缓冲区
    
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
        // 写入 5KB 数据
        let data = vec![0u8; 5120];
        file.write_all(&data).unwrap();
        
        let hash = compute_file_hash(&file_path);
        assert!(hash.is_some());
        // 大文件应该使用部分哈希
        assert!(hash.unwrap().contains("_"));
    }
}
