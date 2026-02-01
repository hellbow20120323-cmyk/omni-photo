# OmniPhoto (全能照片管家)

跨平台、商业级的照片管理工具

## 🎉 项目状态

✅ **所有错误已修复**
✅ **编译成功**
✅ **应用正在运行**

## 技术架构

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: Rust (Tauri)
- **平台**: Mac / Windows / Linux

## 🚀 快速开始

### 启动开发模式

```bash
cd /Users/cullen/omni-photo
source $HOME/.cargo/env  # 如果 Rust 刚安装
npm run tauri:dev
```

### 或使用启动脚本

```bash
./start.sh
```

## 📋 功能特性

- ✅ **智能分类**: 自动识别照片、视频和其他文件类型
- ✅ **渐进式去重**: 基于文件指纹自动检测重复文件
- ✅ **日期归档**: 根据文件创建时间按年月归档
- ✅ **移动/复制模式**: 支持移动（清除原片）或复制（保留原片）
- ✅ **实时进度**: 显示处理进度和统计信息
- ✅ **跨平台**: Mac / Windows / Linux 统一体验

## 📁 项目结构

```
omni-photo/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   ├── App.tsx             # 主应用
│   └── main.tsx            # 入口
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── main.rs         # Tauri 桥接
│   │   ├── hasher.rs       # 哈希算法
│   │   └── scanner.rs      # 文件处理
│   └── Cargo.toml          # Rust 依赖
└── [配置文件]
```

## 🔧 开发

### 前端开发
- 修改 `src/` 下的文件会自动热重载
- 访问 http://localhost:1420 查看前端

### 后端开发
- 修改 `src-tauri/src/` 下的文件会自动重新编译
- 查看终端输出查看 Rust 日志

## 📝 已知限制

- ⚠️ EXIF 提取暂未实现（使用文件系统时间）
- ⚠️ 首次编译需要 5-10 分钟（下载依赖）

## 🎯 下一步开发

- [ ] 添加 EXIF 支持（使用 `kamadak-exif`）
- [ ] 实现并行处理（Rayon）
- [ ] 添加 Dry Run 模式
- [ ] 优化 UI/UX

## 📚 文档

- `SETUP.md` - 详细设置指南
- `PROJECT_STRUCTURE.md` - 项目结构说明
- `QUICKSTART.md` - 快速开始
- `FIXES.md` - 修复记录
- `SUCCESS.md` - 成功状态

## 🐛 故障排除

### 编译错误
```bash
cd src-tauri
cargo clean
cargo check
```

### 端口占用
修改 `vite.config.ts` 中的端口号

### Rust 环境
```bash
source $HOME/.cargo/env
```

## 📄 许可证

MIT License
