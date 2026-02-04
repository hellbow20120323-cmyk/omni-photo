#!/bin/bash


# ---配置区 ---
export APPLE_ID="yuanli2077@gmail.com"
export APPLE_PASSWORD="atks-pcsx-qgxk-mosd"
export APPLE_TEAM_ID="8JWMAN8ZT3"

echo "🚀 开始构建 OmniPhoto 正式版..."

# --- 2. 清理旧版本 ---
rm -rf src-tauri/target/release/bundle/dmg/*.dmg

# --- 3. 执行 Tauri 构建与公证 ---
# 注意：Tauri 会自动根据 tauri.conf.json 里的配置进行签名和公证上传
npm run tauri build

# --- 4. 检查结果 ---
if [ $? -eq 0 ]; then
    echo "✅ 构建并公证成功！"
    echo "📍 安装包位置：src-tauri/target/release/bundle/dmg/"
    open src-tauri/target/release/bundle/dmg/
else
    echo "❌ 构建失败，请检查上方报错信息。"
fi
