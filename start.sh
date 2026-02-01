#!/bin/bash
# OmniPhoto 启动脚本

set -e

echo "🚀 启动 OmniPhoto 开发环境..."
echo ""

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "⚠️  Rust 未安装，正在安装..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 加载 Rust 环境
if [ -f "$HOME/.cargo/env" ]; then
    source $HOME/.cargo/env
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装 Node.js 依赖..."
    npm install
fi

# 启动开发服务器
echo "✅ 环境检查完成"
echo "🎯 启动 Tauri 开发服务器..."
echo ""
npm run tauri:dev
