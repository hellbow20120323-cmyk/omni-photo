#!/usr/bin/env bash
# 请用 ./publish.sh 或 bash publish.sh；不要用 sh publish.sh（会忽略本 shebang，行为可能不一致）。

# --- 1. 基础配置区域 (已根据你的证书信息配置) ---
PRODUCT_NAME="OmniPhoto"
BUNDLE_ID="com.cullen.omniphoto"
TEAM_ID="8JWMAN8ZT3"
APP_CERT="Apple Distribution: tallboy chen (8JWMAN8ZT3)"
INSTALLER_CERT="3rd Party Mac Developer Installer: tallboy chen (8JWMAN8ZT3)"

# --- 2. 路径定义 ---
# 使用 universal-apple-darwin，否则默认仅为当前机器架构（如 arm64），在 Intel Mac 上会「无法打开应用」
RUST_TARGET="universal-apple-darwin"
PROVISION_SOURCE="src-tauri/embedded.provisionprofile"
APP_PATH="src-tauri/target/${RUST_TARGET}/release/bundle/macos/${PRODUCT_NAME}.app"
LEGACY_APP_PATH="src-tauri/target/release/bundle/macos/${PRODUCT_NAME}.app"
PKG_OUTPUT="${PRODUCT_NAME}.pkg"
ENTITLEMENTS="src-tauri/Entitlements.plist"

echo "[publish] 开始执行上架打包流程..."

# --- 3. 环境预检 ---
if [ ! -f "$PROVISION_SOURCE" ]; then
    echo "[publish] 错误: 在 $PROVISION_SOURCE 未找到 Mac App Store 描述文件！"
    exit 1
fi

if [ ! -f "$ENTITLEMENTS" ]; then
    echo "[publish] 错误: 未找到 $ENTITLEMENTS 文件！"
    exit 1
fi

echo "[publish] 清除描述文件的隔离属性 (xattr)..."
xattr -d com.apple.quarantine "$PROVISION_SOURCE" 2>/dev/null

# --- 4. 执行 Tauri 构建 ---
echo "[publish] 正在清理旧构建并重新编译..."
# 通用二进制需要两个 Rust target（Tauri 会分别编译再 lipo）
for _target in aarch64-apple-darwin x86_64-apple-darwin; do
    rustup target list --installed | grep -q "^${_target}$" || rustup target add "${_target}"
done
# 已签名或运行过的 .app 可能被系统加锁，先恢复可写再删（若曾为 root 所有则需手动 sudo）
for _app in "$APP_PATH" "$LEGACY_APP_PATH"; do
    if [ -d "$_app" ]; then
        chmod -R u+rwX "$_app" 2>/dev/null
        chflags -R nouchg "$_app" 2>/dev/null
        if ! rm -rf "$_app" 2>/dev/null; then
            echo "[publish] 普通权限无法删除 $_app (多为 root 属主), 尝试 sudo rm -rf (可能提示输入密码)..."
            if ! sudo rm -rf "$_app"; then
                echo "[publish] 仍失败，请手动执行: sudo rm -rf $_app"
                exit 1
            fi
        fi
    fi
done
# 彻底删掉 dist，由 Vite 重建，避免 prepareOutDir 时 EACCES
if [ -d "dist" ]; then
    chflags -R nouchg dist 2>/dev/null
    chmod -R u+rw dist 2>/dev/null
    rm -rf dist || { echo "[publish] 无法删除 dist，请在本机执行: sudo chown -R \$(whoami) dist && rm -rf dist"; exit 1; }
fi
rm -f "$PKG_OUTPUT" "${PRODUCT_NAME}.unsigned.pkg" "${PRODUCT_NAME}.flat.pkg"
npx tauri build --bundles app --target universal-apple-darwin

# --- 5. 嵌入描述文件、清理扩展属性并代码签名 ---
if [ -d "$APP_PATH" ]; then
    # Tauri v1 不会从 tauri.conf 写入独立 build 号；上架以 src-tauri/Info.plist 为准写入产物
    BUNDLE_INFO="$APP_PATH/Contents/Info.plist"
    if [ -f "$BUNDLE_INFO" ] && [ -f "src-tauri/Info.plist" ]; then
        echo "[publish] 将 CFBundleShortVersionString / CFBundleVersion 同步为 src-tauri/Info.plist..."
        M_VER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "src-tauri/Info.plist")
        M_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "src-tauri/Info.plist")
        /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $M_VER" "$BUNDLE_INFO"
        /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $M_BUILD" "$BUNDLE_INFO"
    fi

    echo "[publish] 正在嵌入 Mac App Store 描述文件..."
    cp "$PROVISION_SOURCE" "$APP_PATH/Contents/embedded.provisionprofile"

    # 去掉 AppleDouble（._*），避免 pkg BOM 含 ._OmniPhoto.app 等导致安装异常
    APP_PARENT="$(cd "$(dirname "$APP_PATH")" && pwd)"
    find "$APP_PARENT" -maxdepth 1 -name '._*' -delete 2>/dev/null
    find "$APP_PATH" -name '._*' -delete 2>/dev/null

    # 关键：彻底清除 App 包内所有文件的扩展属性 (解决 91109 等问题)
    echo "[publish] 正在递归清除 App Bundle 的扩展属性 (xattr -cr)..."
    xattr -cr "$APP_PATH"

    # 执行代码签名：App Store 要求 --options runtime + 正确的 entitlements
    echo "[publish] 正在进行代码签名 (codesign)..."
    codesign --force --options runtime --entitlements "$ENTITLEMENTS" --sign "$APP_CERT" "$APP_PATH"

    if [ $? -eq 0 ]; then
        echo "[publish] 代码签名完成。"
    else
        echo "[publish] 代码签名失败，请检查证书名称是否匹配。"
        exit 1
    fi
else
    echo "[publish] 找不到编译产物: $APP_PATH"
    exit 1
fi

# --- 6. 封装为 .pkg 安装包 ---
# productbuild 会为 App 自动写入 <relocate>：安装器会按 Bundle ID 查找磁盘上已有的 .app。
# 开发机在工程目录里若还有 OmniPhoto.app，安装会「升级」到该副本，/Applications 下不会出现新应用。
echo "[publish] 生成 .pkg (已移除 relocate, 避免本机测试装错路径)..."
PKG_UNSIGNED="${PRODUCT_NAME}.unsigned.pkg"
PKG_FLAT="${PRODUCT_NAME}.flat.pkg"
rm -f "$PKG_OUTPUT" "$PKG_UNSIGNED" "$PKG_FLAT"
if ! productbuild --component "$APP_PATH" /Applications "$PKG_UNSIGNED"; then
    echo "[publish] productbuild 失败。"
    exit 1
fi
PKG_EXPAND=$(mktemp -d)
pkgutil --expand "$PKG_UNSIGNED" "$PKG_EXPAND/expanded"
shopt -s nullglob
for PI in "$PKG_EXPAND/expanded"/*.pkg/PackageInfo; do
    if grep -q "<relocate>" "$PI"; then
        sed -i "" "/<relocate>/,/<\\/relocate>/d" "$PI"
    fi
done
shopt -u nullglob
if ! pkgutil --flatten "$PKG_EXPAND/expanded" "$PKG_FLAT"; then
    rm -rf "$PKG_EXPAND" "$PKG_UNSIGNED" "$PKG_FLAT"
    echo "[publish] pkgutil flatten 失败。"
    exit 1
fi
rm -rf "$PKG_EXPAND" "$PKG_UNSIGNED"
if ! productsign --sign "$INSTALLER_CERT" "$PKG_FLAT" "$PKG_OUTPUT"; then
    rm -f "$PKG_FLAT"
    echo "[publish] productsign 失败 (需安装器证书)。"
    exit 1
fi
rm -f "$PKG_FLAT"

echo "--------------------------------------------------"
echo "[publish] 完成。上架包: $(pwd)/$PKG_OUTPUT"
echo "[publish] 可拖入 Transporter；本机安装后应出现在 /Applications。"
echo "--------------------------------------------------"
