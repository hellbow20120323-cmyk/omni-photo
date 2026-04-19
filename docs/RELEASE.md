# 发版说明（OmniPhoto）

单仓库、单主干（`main`）、**Mac 与 Windows 可不同日发版**；功能代码共用，差异在打包、签名与 CI。

## 版本号

- 发版前请对齐 **`package.json`** 的 `version`、**`src-tauri/Cargo.toml`** 的 `version`、**`src-tauri/tauri.conf.json`** 里 `package.version`（三处一致，避免安装包显示混乱）。
- Git **一个 tag 对应一个应用版本**，例如 `v1.2.0`，与上述版本号一致。

## Mac 与 Windows 分开发版

- **无需同一天上传**：可先打 `v1.2.0` tag，先跑 Mac 流水线或本地 `publish.sh`，数日后再跑 Windows 工作流或本地构建，在 GitHub Release 上**补传** Windows 安装包即可。
- **同源 commit**：晚发的平台应从**打 tag 时的 commit** 构建（GitHub Actions 在 tag 上运行会自动检出该 commit）。若 `main` 已前进，不要用最新 `main` 冒充同一版本号。
- Release 文案建议写明：**Mac 已提供 / Windows 已提供** 及各自构建时间，避免用户误以为双端同时上架。

## 本地构建

### Windows（在 Windows 机器或对应环境）

```bash
npm ci
npm run build
npm run tauri:build:windows
```

产物通常在 `src-tauri/target/release/bundle/msi/`、`nsis/` 下（以 Tauri 实际输出为准）。

### macOS 通用二进制（签名与公证）

- 正式上架/分发仍使用仓库内 **`publish.sh`**（含描述文件、签名、`universal-apple-darwin` 等）。
- CI 上的 macOS 任务为**去签名配置的临时构建**，用于产出未签名 `.dmg` 做冒烟或内测，**不能替代**你本机 `publish.sh` 的正式流程。

## GitHub Actions

仓库内提供两个**仅手动触发**的工作流（Actions → 选择 workflow → Run workflow）：

| Workflow        | 说明 |
|-----------------|------|
| **Build Windows** | `windows-latest`，产出 MSI/NSIS 等，Artifact 上传 |
| **Build macOS**   | `macos-latest`，构建前会去掉 `signingIdentity` 以适配无证书 Runner，产出未签名 `.dmg`（若你后续在仓库配置 Apple 签名 Secret，可再改为正式签名流程） |

Mac 与 Windows **互不阻塞**，可按需只跑其中一个。

## 发版检查清单

1. [ ] 三处版本号已对齐（`package.json` / `Cargo.toml` / `tauri.conf.json`）。
2. [ ] `main` 已合并待发版改动，`git pull` 干净。
3. [ ] 创建并推送 tag：`git tag vX.Y.Z && git push origin vX.Y.Z`（可选，便于记录）。
4. [ ] 在 GitHub Actions 运行对应平台构建，或本地执行 `publish.sh`（Mac）/ `tauri:build:windows`（Windows）。
5. [ ] 在 GitHub Release（或内部分发渠道）上传产物，并写清平台与 commit。

## 代码与平台隔离约定

- 业务逻辑放在共享 `src/` 与 `src-tauri/src/`；若出现平台分支，使用 Rust `#[cfg(target_os = "macos")]` / `#[cfg(windows)]` 或独立小模块，避免散落魔法判断。
- Windows 打包**不要**依赖 `publish.sh`；Mac App Store / 公证**不要**依赖 Windows 产物路径。
