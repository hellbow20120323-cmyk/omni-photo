# OmniPhoto 项目结构

## 📁 完整目录树

```
omni-photo/
├── src/                          # React 前端源码
│   ├── components/               # UI 组件
│   │   ├── DirectorySelector.tsx # 目录选择器（支持拖拽）
│   │   ├── ProgressBar.tsx       # 进度条和统计信息
│   │   ├── LogViewer.tsx         # 日志查看器
│   │   └── ControlPanel.tsx      # 控制面板（移动/复制选择）
│   ├── hooks/                    # React Hooks（预留）
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # React 入口文件
│   └── index.css                 # 全局样式（Tailwind）
│
├── src-tauri/                    # Rust 后端（Tauri）
│   ├── src/
│   │   ├── main.rs               # Tauri 主程序
│   │   │   ├── scan_directory    # 扫描目录命令
│   │   │   ├── process_files     # 处理文件命令
│   │   │   └── cancel_task       # 取消任务命令
│   │   ├── hasher.rs             # 渐进式哈希算法
│   │   │   ├── compute_file_hash # 计算文件哈希
│   │   │   └── compute_full_md5  # 完整 MD5（小文件）
│   │   └── scanner.rs            # 文件扫描和处理
│   │       ├── get_file_date     # 获取文件日期（EXIF优先）
│   │       ├── get_file_type_with_exts # 判断文件类型（支持自定义扩展名）
│   │       ├── move_file         # 移动文件
│   │       └── copy_file         # 复制文件
│   ├── build.rs                  # Tauri 构建脚本
│   ├── Cargo.toml                # Rust 依赖配置
│   └── tauri.conf.json           # Tauri 应用配置
│
├── dist/                         # 前端构建输出（自动生成）
├── node_modules/                 # Node.js 依赖（自动生成）
│
├── .gitignore                    # Git 忽略文件
├── index.html                    # HTML 入口
├── package.json                  # Node.js 项目配置
├── vite.config.ts                # Vite 构建配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.js            # Tailwind CSS 配置
├── postcss.config.js             # PostCSS 配置
│
├── README.md                     # 项目说明
├── SETUP.md                      # 设置指南
└── PROJECT_STRUCTURE.md          # 本文档
```

## 🔧 核心模块说明

### 后端 (Rust)

#### `hasher.rs` - 渐进式哈希引擎
- **策略**: 大小 → 头尾1KB → 全量MD5
- **线程安全**: ✅ 使用 Rust 的所有权系统保证
- **跨平台**: ✅ 使用标准库，无平台特定代码

#### `scanner.rs` - 文件扫描与处理
- **EXIF 提取**: 使用 `exif` crate
- **日期回退**: EXIF → 创建时间 → 修改时间
- **文件操作**: 跨平台的移动/复制，自动处理路径冲突

#### `main.rs` - Tauri 桥接层
- **命令**: 暴露给前端的 Rust 函数
- **事件**: 通过 Tauri 事件系统推送进度
- **状态管理**: 使用 Arc<Mutex> 管理任务状态

### 前端 (React + TypeScript)

#### `App.tsx` - 主应用
- **状态管理**: 使用 React Hooks
- **事件监听**: 监听 Tauri 进度事件
- **布局**: Tailwind CSS 响应式设计

#### `DirectorySelector.tsx`
- **功能**: 目录选择（按钮 + 拖拽区域）
- **API**: 使用 Tauri 的 `dialog.open`

#### `ProgressBar.tsx`
- **显示**: 进度条 + 统计卡片
- **数据**: 照片/视频/其他/重复/错误数量

#### `LogViewer.tsx`
- **功能**: 实时日志显示
- **特性**: 自动滚动到底部

#### `ControlPanel.tsx`
- **功能**: 移动/复制模式选择 + 开始/取消按钮

## 📦 依赖说明

### Rust (Cargo.toml)
- `tauri`: Tauri 框架
- `serde`: 序列化/反序列化
- `md5`: MD5 哈希算法
- `exif`: EXIF 数据提取
- `rayon`: 并行处理（预留）
- `tokio`: 异步运行时（预留）

### Node.js (package.json)
- `react`: React 框架
- `@tauri-apps/api`: Tauri API 绑定
- `tailwindcss`: CSS 框架
- `typescript`: TypeScript 编译器
- `vite`: 构建工具

## 🚀 开发工作流

1. **前端开发**: `npm run dev` (Vite 开发服务器)
2. **后端开发**: Rust 代码修改后自动重新编译
3. **完整应用**: `npm run tauri:dev` (启动 Tauri 窗口)

## 📝 代码规范

- **Rust**: 遵循 Rust 官方风格指南
- **TypeScript**: 使用严格模式，启用所有类型检查
- **React**: 函数组件 + Hooks，避免类组件

## 🔐 安全考虑

- **文件系统访问**: 通过 Tauri 的权限系统控制
- **路径验证**: 所有路径都经过验证
- **错误处理**: 完善的错误处理和用户提示
