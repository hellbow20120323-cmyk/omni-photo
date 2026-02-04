import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import DirectorySelector from "./components/DirectorySelector";
import ProgressBar from "./components/ProgressBar";
import LogViewer from "./components/LogViewer";
import ControlPanel from "./components/ControlPanel";
import AdvancedSettings from "./components/AdvancedSettings";

/** 以 1024 为换算基数显示字节（B → KB → MB → GB） */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface ProgressInfo {
  current: number;
  total: number;
  message: string;
  stats: {
    photos: number;
    videos: number;
    others: number;
    duplicates: number;
    errors: number;
    processed: number;
    total_duplicate_size: number;
  };
}

interface AdvancedOptions {
  /** 是否在归档库中保留源目录的一级目录结构 */
  preserveTopLevelDir: boolean;
  /** 自定义照片扩展名输入（逗号/空格分隔） */
  photoExtensionsInput: string;
  /** 自定义视频扩展名输入（逗号/空格分隔） */
  videoExtensionsInput: string;
}

function App() {
  const [sourceDir, setSourceDir] = useState<string>("");
  const [targetDir, setTargetDir] = useState<string>("");
  const [compareWithArchive, setCompareWithArchive] = useState<boolean>(false);
  const [duplicatesFolderSize, setDuplicatesFolderSize] = useState<number | null>(null);
  const [duplicatesSizeLoading, setDuplicatesSizeLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  /** 当前拖拽悬停的目标：收件箱 / 归档库，用于 Tauri 原生拖放时确定写入哪个输入 */
  const [dropTarget, setDropTarget] = useState<"source" | "target" | null>(null);
  /** 高级配置：保留一级目录、自定义扩展名 */
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    preserveTopLevelDir: false,
    photoExtensionsInput: "jpg, jpeg, png, tiff, heic, raw, arw, dng, webp",
    videoExtensionsInput: "mp4, mov, avi, mkv",
  });
  /** 高级配置是否有尚未保存的修改（用于“保存配置”按钮提示） */
  const [advancedDirty, setAdvancedDirty] = useState<boolean>(false);
  /** 高级配置面板是否展开（默认收起） */
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  // #region agent log
  const firstProgressLogged = useRef(false);
  const debugLog = (message: string, data: Record<string, unknown>, hypothesisId: string) => {
    fetch("http://127.0.0.1:7242/ingest/daed423e-5dfd-4436-9df1-2d61b8be3976", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "App.tsx",
        message,
        data,
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId,
      }),
    }).catch(() => {});
  };
  // #endregion

  const handleStatDuplicatesSize = async () => {
    if (!targetDir) return;
    setDuplicatesSizeLoading(true);
    try {
      const size = await invoke<number>("get_duplicates_folder_size", {
        targetDir: targetDir,
      });
      setDuplicatesFolderSize(size);
    } catch (e) {
      setDuplicatesFolderSize(null);
      setLogs((prev) => [...prev, `统计重复目录失败: ${e}`]);
    } finally {
      setDuplicatesSizeLoading(false);
    }
  };

  // 启动时从 localStorage 加载已保存的高级配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem("omniPhotoAdvancedOptions");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AdvancedOptions>;
        setAdvancedOptions((prev) => ({
          preserveTopLevelDir: parsed.preserveTopLevelDir ?? prev.preserveTopLevelDir,
          photoExtensionsInput: parsed.photoExtensionsInput ?? prev.photoExtensionsInput,
          videoExtensionsInput: parsed.videoExtensionsInput ?? prev.videoExtensionsInput,
        }));
        setAdvancedDirty(false);
      }
    } catch {
      // 忽略解析错误，继续使用默认配置
    }
  }, []);

  // 监听进度事件
  useEffect(() => {
    const unlisten = listen<ProgressInfo>("progress", (event) => {
      // #region agent log
      if (!firstProgressLogged.current) {
        firstProgressLogged.current = true;
        debugLog("first progress event received", {
          current: event.payload.current,
          total: event.payload.total,
          message: event.payload.message,
        }, "H2");
      }
      // #endregion
      setProgress(event.payload);
      setLogs((prev) => [...prev, event.payload.message]);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 监听 Tauri 原生文件拖放（可获取真实路径）；结合 dropTarget 决定写入收件箱或归档库
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    appWindow.onFileDropEvent((event) => {
      if (event.payload.type !== "drop" || !event.payload.paths?.length) return;
      const target = dropTarget;
      setDropTarget(null);
      if (!target) return;
      const path = event.payload.paths[0];
      invoke<string>("resolve_drop_path", { path })
        .then((dir) => {
          if (target === "source") setSourceDir(dir);
          else setTargetDir(dir);
          if (target === "target") setDuplicatesFolderSize(null);
        })
        .catch((e) => setLogs((prev) => [...prev, `拖放解析路径失败: ${e}`]));
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [dropTarget]);

  const handleStart = async () => {
    // #region agent log
    debugLog("handleStart entered", { sourceDir: !!sourceDir, targetDir: !!targetDir }, "H4");
    // #endregion
    if (!sourceDir || !targetDir) {
      alert("请先选择源目录和目标目录");
      return;
    }

    // 立即显示“正在预检”，避免收件箱文件很多时长时间无反馈
    setIsProcessing(true);
    setLogs(["正在预检磁盘空间…"]);
    setProgress(null);

    try {
      // #region agent log
      debugLog("before check_disk_space", {}, "H1");
      // #endregion
      const check = await invoke<{
        source_size: number;
        available_on_target: number;
        sufficient: boolean;
      }>("check_disk_space", {
        sourceDir: sourceDir,
        targetDir: targetDir,
      });
      // #region agent log
      debugLog("after check_disk_space", { sufficient: check.sufficient }, "H1");
      // #endregion
      if (!check.sufficient) {
        setIsProcessing(false);
        setLogs((prev) => [...prev, `预检完成：磁盘空间不足`]);
        alert(
          `磁盘空间不足，无法安全整理。\n\n` +
            `收件箱总大小：${formatBytes(check.source_size)}\n` +
            `归档库所在盘剩余空间：${formatBytes(check.available_on_target)}\n\n` +
            `请释放归档盘空间后再试，或更换归档库到空间更大的磁盘。`
        );
        return;
      }
    } catch (e) {
      setIsProcessing(false);
      setLogs((prev) => [...prev, `预检失败: ${e}`]);
      alert(`磁盘空间预检失败: ${e}`);
      return;
    }

    // 将扩展名输入解析成数组（小写、去空、去重）
    const parseExtInput = (input: string): string[] => {
      const items = input
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return Array.from(new Set(items));
    };

    const photoExts = parseExtInput(advancedOptions.photoExtensionsInput);
    const videoExts = parseExtInput(advancedOptions.videoExtensionsInput);

    // 若为空数组，则不传给后端，让后端走默认逻辑
    const advancedPayload: Record<string, unknown> = {
      preserveTopLevelDir: advancedOptions.preserveTopLevelDir,
    };
    if (photoExts.length > 0) {
      advancedPayload.photoExtensions = photoExts;
    }
    if (videoExts.length > 0) {
      advancedPayload.videoExtensions = videoExts;
    }

    // #region agent log
    firstProgressLogged.current = false;
    debugLog("setIsProcessing true, invoking process_files", {}, "H2");
    // #endregion
    setLogs((prev) => [...prev, "预检完成，开始整理…"]);
    setProgress(null);

    try {
      const stats = await invoke("process_files", {
        sourceDir: sourceDir,
        targetDir: targetDir,
        compareWithArchive: compareWithArchive,
        advanced: advancedPayload,
      });

      setLogs((prev) => [...prev, "✅ 处理完成！"]);
      const s = stats as any;
      const savedSpace =
        s.total_duplicate_size != null && s.total_duplicate_size > 0
          ? `\n\n为您节省了 ${formatBytes(s.total_duplicate_size)} 空间`
          : "";
      alert(`处理完成！\n照片: ${s.photos}\n视频: ${s.videos}\n其他: ${s.others}\n重复: ${s.duplicates}\n错误: ${s.errors}${savedSpace}`);
    } catch (error) {
      setLogs((prev) => [...prev, `❌ 错误: ${error}`]);
      alert(`处理失败: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await invoke("cancel_task");
      setIsProcessing(false);
      setLogs((prev) => [...prev, "⚠️ 任务已取消"]);
    } catch (error) {
      console.error("取消任务失败:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          📸 OmniPhoto - 全能照片管家
        </h1>

        <div className="bg-white rounded-lg shadow-xl p-6 space-y-6">
          <DirectorySelector
            label="收件箱"
            value={sourceDir}
            onChange={setSourceDir}
            placeholder="选择或拖拽收件箱目录"
            dropTargetId="source"
            dropTarget={dropTarget}
            onDropTargetChange={setDropTarget}
          />

          <DirectorySelector
            label="归档库"
            value={targetDir}
            onChange={(path) => {
              setTargetDir(path);
              setDuplicatesFolderSize(null);
            }}
            placeholder="选择或拖拽归档库目录"
            dropTargetId="target"
            dropTarget={dropTarget}
            onDropTargetChange={setDropTarget}
          />

          {targetDir && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">
                重复目录 (_Duplicates) 大小：
              </span>
              <span className="tabular-nums text-gray-900">
                {duplicatesFolderSize !== null
                  ? formatBytes(duplicatesFolderSize)
                  : "—"}
              </span>
              <button
                type="button"
                onClick={handleStatDuplicatesSize}
                disabled={duplicatesSizeLoading}
                className="rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {duplicatesSizeLoading ? "统计中…" : "统计"}
              </button>
            </div>
          )}

          <ControlPanel
            compareWithArchive={compareWithArchive}
            onCompareWithArchiveChange={setCompareWithArchive}
            isProcessing={isProcessing}
            onStart={handleStart}
            onCancel={handleCancel}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline"
            >
              {showAdvanced ? "隐藏高级配置" : "显示高级配置"}
            </button>
          </div>

          {showAdvanced && (
            <AdvancedSettings
              value={advancedOptions}
              onChange={(updater) => {
                setAdvancedDirty(true);
                setAdvancedOptions(updater);
              }}
              onSave={() => {
                try {
                  localStorage.setItem(
                    "omniPhotoAdvancedOptions",
                    JSON.stringify(advancedOptions),
                  );
                  setAdvancedDirty(false);
                  setLogs((prev) => [...prev, "高级配置已保存"]);
                } catch (e) {
                  setLogs((prev) => [...prev, `高级配置保存失败: ${e}`]);
                }
              }}
              isDirty={advancedDirty}
            />
          )}

          {progress && (
            <>
              <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <span className="text-lg" aria-hidden>♻️</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600">已节省空间</p>
                    <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-emerald-600">
                      {formatBytes(progress.stats.total_duplicate_size)}
                    </p>
                  </div>
                </div>
              </div>
              <ProgressBar
                current={progress.current}
                total={progress.total}
                stats={progress.stats}
              />
            </>
          )}

          <LogViewer logs={logs} />
        </div>
      </div>
    </div>
  );
}

export default App;
