# OmniPhoto 项目设置指南

## 前置要求

### 1. 安装 Rust

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 下载并运行 https://rustup.rs/
```

### 2. 安装 Node.js 18+

```bash
# 使用 nvm (推荐)
nvm install 18
nvm use 18
```

### 3. 安装系统依赖

#### macOS
```bash
# 安装 Xcode Command Line Tools
xcode-select --install
```

#### Windows
- 安装 Microsoft C++ Build Tools
- 安装 WebView2 (通常已预装)

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Fedora
sudo dnf install webkit2gtk3-devel.x86_64 \
    openssl-devel \
    curl \
    wget \
    libappindicator \
    librsvg2-devel
```

## 安装项目依赖

```bash
cd omni-photo
npm install
```

## 开发模式

```bash
npm run tauri:dev
```

这将启动：
- Vite 开发服务器 (前端)
- Tauri 应用窗口

## 构建生产版本

```bash
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/`

## 项目结构说明

```
omni-photo/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   │   ├── DirectorySelector.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── LogViewer.tsx
│   │   └── ControlPanel.tsx
│   ├── App.tsx             # 主应用组件
│   └── main.tsx            # 入口文件
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # Tauri 命令和事件处理
│   │   ├── hasher.rs       # 渐进式哈希算法
│   │   └── scanner.rs      # 文件扫描和 EXIF 提取
│   └── Cargo.toml          # Rust 依赖配置
└── package.json            # Node.js 依赖配置
```

## 核心功能实现

### 后端 (Rust)

1. **hasher.rs**: 渐进式哈希算法
   - 小文件：直接 MD5
   - 大文件：大小 + 头尾 1KB 哈希

2. **scanner.rs**: 文件处理
   - EXIF 日期提取
   - 文件类型识别
   - 跨平台文件移动/复制

3. **main.rs**: Tauri 桥接
   - `scan_directory`: 扫描目录
   - `process_files`: 处理文件
   - `cancel_task`: 取消任务

### 前端 (React)

1. **DirectorySelector**: 目录选择组件
2. **ProgressBar**: 进度显示组件
3. **LogViewer**: 日志查看组件
4. **ControlPanel**: 控制面板（移动/复制选择）

## 故障排除

### Rust 编译错误

```bash
# 更新 Rust
rustup update

# 清理构建缓存
cd src-tauri
cargo clean
```

### Node 模块问题

```bash
# 删除并重新安装
rm -rf node_modules package-lock.json
npm install
```

### Tauri 构建失败

确保已安装所有系统依赖（见前置要求部分）

## 下一步开发

参考项目根目录的 `README.md` 了解完整的功能规划。
