#!/bin/bash

# --- 1. 基础配置区域 (已根据你的证书信息配置) ---
PRODUCT_NAME="OmniPhoto"
BUNDLE_ID="com.cullen.omniphoto"
TEAM_ID="8JWMAN8ZT3"
APP_CERT="Apple Distribution: tallboy chen (8JWMAN8ZT3)"
INSTALLER_CERT="3rd Party Mac Developer Installer: tallboy chen (8JWMAN8ZT3)"

# --- 2. 路径定义 ---
PROVISION_SOURCE="src-tauri/embedded.provisionprofile"
APP_PATH="src-tauri/target/release/bundle/macos/${PRODUCT_NAME}.app"
PKG_OUTPUT="${PRODUCT_NAME}.pkg"
ENTITLEMENTS="src-tauri/Entitlements.plist"

echo "🚀 开始执行上架打包流程..."

# --- 3. 环境预检 ---
if [ ! -f "$PROVISION_SOURCE" ]; then
    echo "❌ 错误: 在 $PROVISION_SOURCE 未找到描述文件！"
    exit 1
fi

if [ ! -f "$ENTITLEMENTS" ]; then
    echo "❌ 错误: 未找到 $ENTITLEMENTS 文件！"
    exit 1
fi

# 清除描述文件的隔离属性 (预防 91109 错误)
echo "🧹 清除描述文件的隔离属性..."
xattr -d com.apple.quarantine "$PROVISION_SOURCE" 2>/dev/null

# --- 4. 执行 Tauri 构建 ---
echo "🔨 正在清理旧构建并重新编译..."
rm -rf src-tauri/target/release/bundle/macos/*.app
rm -f "$PKG_OUTPUT"
npm run tauri build

# --- 5. 嵌入描述文件与属性清理 ---
if [ -d "$APP_PATH" ]; then
    echo "📄 正在嵌入描述文件..."
    cp "$PROVISION_SOURCE" "$APP_PATH/Contents/embedded.provisionprofile"

    # 关键：彻底清除 App 包内所有文件的扩展属性 (解决 91109 错误)
    echo "🧹 正在递归清除 App Bundle 的所有扩展属性 (xattr -cr)..."
    xattr -cr "$APP_PATH"

    # --- 6. 执行代码签名 ---
    echo "🔏 正在进行代码签名 (Codesign)..."
    # --options runtime 是 App Store 强制要求的硬核加固
    codesign --force --options runtime --entitlements "$ENTITLEMENTS" --sign "$APP_CERT" "$APP_PATH"

    if [ $? -eq 0 ]; then
        echo "✅ 代码签名完成。"
    else
        echo "❌ 代码签名失败，请检查证书名称是否匹配。"
        exit 1
    fi
else
    echo "❌ 找不到编译产物: $APP_PATH"
    exit 1
fi

# --- 7. 封装为 .pkg 安装包 ---
echo "📦 正在生成最终的 .pkg 文件..."
productbuild --component "$APP_PATH" /Applications \
             --sign "$INSTALLER_CERT" \
             "$PKG_OUTPUT"

if [ $? -eq 0 ]; then
    echo "--------------------------------------------------"
    echo "🎉 恭喜！OmniPhoto 上架包已就绪。"
    echo "📍 路径: $(pwd)/$PKG_OUTPUT"
    echo "👉 现在你可以放心地将其拖入 Transporter 交付了。"
    echo "--------------------------------------------------"
else
    echo "❌ .pkg 封装失败。"
    exit 1
fi
