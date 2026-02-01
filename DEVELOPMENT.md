# OmniPhoto 开发指南

## 🚀 当前状态

✅ Node.js 依赖已安装
✅ Rust 正在安装中...
⏳ Tauri 应用准备启动

## 📝 开发命令

### 启动开发模式
```bash
cd /Users/cullen/omni-photo
source $HOME/.cargo/env  # 如果 Rust 刚安装
npm run tauri:dev
```

### 仅启动前端（用于 UI 开发）
```bash
npm run dev
```
访问 http://localhost:1420

### 构建生产版本
```bash
npm run tauri:build
```

## 🔧 开发工作流

### 1. 前端开发
- 修改 `src/` 目录下的 React 组件
- Vite 会自动热重载
- 使用浏览器开发者工具调试

### 2. 后端开发
- 修改 `src-tauri/src/` 目录下的 Rust 文件
- Tauri 会自动重新编译
- 查看终端输出查看 Rust 日志

### 3. 测试流程
1. 选择收件箱目录
2. 选择归档库目录
3. 选择移动或复制模式
4. 点击"开始整理"
5. 观察进度和日志

## 🐛 常见问题

### Rust 编译慢
首次编译 Rust 项目需要下载依赖和编译标准库，可能需要 5-10 分钟。后续会快很多。

### 端口被占用
如果 1420 端口被占用，修改 `vite.config.ts` 中的端口号。

### Tauri 窗口不显示
检查终端是否有错误信息，确保 Rust 编译成功。

## 📚 下一步开发任务

### MVP 功能完善
- [ ] 添加文件预览功能
- [ ] 优化进度显示
- [ ] 添加错误恢复机制
- [ ] 实现 Dry Run 模式

### 性能优化
- [ ] 使用 Rayon 实现并行处理
- [ ] 添加文件缓存机制
- [ ] 优化大文件处理

### UI/UX 改进
- [ ] 添加拖拽文件支持
- [ ] 优化移动端适配
- [ ] 添加主题切换
- [ ] 添加动画效果

## 💡 开发提示

1. **使用 Cursor AI**: 可以直接问 Cursor 如何实现某个功能
2. **查看 Tauri 文档**: https://tauri.app/
3. **Rust 学习资源**: https://doc.rust-lang.org/book/
4. **React 文档**: https://react.dev/
