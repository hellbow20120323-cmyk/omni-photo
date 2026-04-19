import { useState, useEffect, useRef, startTransition } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { appWindow } from "@tauri-apps/api/window";
import { ScrollText } from "lucide-react";
import DirectorySelector from "./components/DirectorySelector";
import ControlPanel from "./components/ControlPanel";
import DedupeSettingsCard from "./components/DedupeSettingsCard";
import AdvancedSettings from "./components/AdvancedSettings";
import { BilingualInline, BilingualButtonLabel } from "./components/Bilingual";
import { useDisplayMode } from "./context/DisplayModeContext";
import LanguageToggle from "./components/LanguageToggle";
import FlowArrow from "./components/FlowArrow";
import LogDrawer from "./components/LogDrawer";
import LocalFirstBadge from "./components/LocalFirstBadge";
import ProcessingStatus from "./components/ProcessingStatus";
import NoticeModal from "./components/NoticeModal";
import ArchiveResultModal, { type ResultStats } from "./components/ArchiveResultModal";

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
    /** Only present on the final invoke result; omitted on progress events. */
    directory_preview?: string[];
    directory_preview_truncated?: boolean;
  };
}

interface AdvancedOptions {
  preserveTopLevelDir: boolean;
  photoExtensionsInput: string;
  videoExtensionsInput: string;
}

function App() {
  const { mode } = useDisplayMode();
  const [sourceDir, setSourceDir] = useState<string>("");
  const [targetDir, setTargetDir] = useState<string>("");
  const [compareWithArchive, setCompareWithArchive] = useState<boolean>(false);
  const [duplicatesFolderSize, setDuplicatesFolderSize] = useState<number | null>(null);
  const [duplicatesSizeLoading, setDuplicatesSizeLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dropTarget, setDropTarget] = useState<"source" | "target" | null>(null);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    preserveTopLevelDir: false,
    photoExtensionsInput: "jpg, jpeg, png, heic, raw, arw, dng, webp",
    videoExtensionsInput: "mp4, mov, avi, mkv",
  });
  const [advancedDirty, setAdvancedDirty] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<{
    stats: ResultStats;
    archivePath: string;
  } | null>(null);
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
      setLogs((prev) => [
        ...prev,
        mode === "zh"
          ? `无法统计 _Duplicates 文件夹：${e}`
          : `Could not measure _Duplicates folder: ${e}`,
      ]);
    } finally {
      setDuplicatesSizeLoading(false);
    }
  };

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
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const unlisten = listen<ProgressInfo>("progress", (event) => {
      if (!firstProgressLogged.current) {
        firstProgressLogged.current = true;
        debugLog(
          "first progress event received",
          {
            current: event.payload.current,
            total: event.payload.total,
            message: event.payload.message,
          },
          "H2",
        );
      }
      setProgress(event.payload);
      setLogs((prev) => [...prev, event.payload.message]);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    appWindow
      .onFileDropEvent((event) => {
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
          .catch((e) =>
            setLogs((prev) => [
              ...prev,
              mode === "zh" ? `拖放路径失败：${e}` : `Drop path failed: ${e}`,
            ]),
          );
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => {
      unlisten?.();
    };
  }, [dropTarget, mode]);

  const handleStart = async () => {
    debugLog("handleStart entered", { sourceDir: !!sourceDir, targetDir: !!targetDir }, "H4");
    if (!sourceDir || !targetDir) {
      setNotice({
        title: mode === "zh" ? "请选择目录" : "Choose folders",
        message:
          mode === "zh"
            ? "请先选择收件箱与归档库文件夹。"
            : "Choose both inbox and archive folders first.",
      });
      return;
    }

    setIsProcessing(true);
    setLogs([mode === "zh" ? "正在检查磁盘可用空间…" : "Checking free disk space…"]);
    setProgress(null);

    try {
      debugLog("before check_disk_space", {}, "H1");
      const check = await invoke<{
        source_size: number;
        available_on_target: number;
        sufficient: boolean;
      }>("check_disk_space", {
        sourceDir: sourceDir,
        targetDir: targetDir,
      });
      debugLog("after check_disk_space", { sufficient: check.sufficient }, "H1");
      if (!check.sufficient) {
        setIsProcessing(false);
        setLogs((prev) => [
          ...prev,
          mode === "zh" ? "预检：磁盘空间不足" : "Pre-check: not enough disk space",
        ]);
        setNotice({
          title: mode === "zh" ? "空间不足" : "Not enough space",
          message:
            mode === "zh"
              ? `磁盘空间不足，无法安全复制。\n\n收件箱合计：${formatBytes(check.source_size)}\n归档盘可用：${formatBytes(check.available_on_target)}\n\n请释放空间或更换归档位置。`
              : `Not enough free space to copy safely.\n\nInbox total: ${formatBytes(check.source_size)}\nFree on archive volume: ${formatBytes(check.available_on_target)}\n\nFree up space or choose another archive folder.`,
        });
        return;
      }
    } catch (e) {
      setIsProcessing(false);
      setLogs((prev) => [...prev, mode === "zh" ? `预检失败：${e}` : `Pre-check failed: ${e}`]);
      setNotice({
        title: mode === "zh" ? "磁盘检查失败" : "Disk check failed",
        message: String(e),
      });
      return;
    }

    const parseExtInput = (input: string): string[] => {
      const items = input
        .split(/[,\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      return Array.from(new Set(items));
    };

    const photoExts = parseExtInput(advancedOptions.photoExtensionsInput);
    const videoExts = parseExtInput(advancedOptions.videoExtensionsInput);

    const advancedPayload: Record<string, unknown> = {
      preserveTopLevelDir: advancedOptions.preserveTopLevelDir,
    };
    if (photoExts.length > 0) {
      advancedPayload.photoExtensions = photoExts;
    }
    if (videoExts.length > 0) {
      advancedPayload.videoExtensions = videoExts;
    }

    firstProgressLogged.current = false;
    debugLog("setIsProcessing true, invoking process_files", {}, "H2");
    setLogs((prev) => [
      ...prev,
      mode === "zh" ? "预检通过，开始整理…" : "Pre-check passed. Organizing…",
    ]);
    setProgress(null);

    try {
      const stats = await invoke("process_files", {
        sourceDir: sourceDir,
        targetDir: targetDir,
        compareWithArchive: compareWithArchive,
        advanced: advancedPayload,
      });

      setLogs((prev) => [...prev, mode === "zh" ? "已完成。" : "Done."]);
      const raw = stats as Partial<ResultStats>;
      const s: ResultStats = {
        photos: raw.photos ?? 0,
        videos: raw.videos ?? 0,
        others: raw.others ?? 0,
        duplicates: raw.duplicates ?? 0,
        errors: raw.errors ?? 0,
        processed: raw.processed ?? 0,
        total_duplicate_size: raw.total_duplicate_size ?? 0,
        directory_preview: raw.directory_preview ?? [],
        directory_preview_truncated: raw.directory_preview_truncated ?? false,
      };
      setProgress(null);
      startTransition(() => {
        setResultData({ stats: s, archivePath: targetDir });
        setResultOpen(true);
      });
    } catch (error) {
      setLogs((prev) => [...prev, mode === "zh" ? `错误：${error}` : `Error: ${error}`]);
      setNotice({
        title: mode === "zh" ? "失败" : "Failed",
        message: String(error),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      await invoke("cancel_task");
      setIsProcessing(false);
      setLogs((prev) => [...prev, mode === "zh" ? "已取消。" : "Cancelled."]);
    } catch (error) {
      console.error("cancel_task failed:", error);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-morandi-100 via-sea-100/90 to-[#b8c5d4] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="glass-panel rounded-[28px] border border-white/20 bg-white/30 p-6 shadow-glass backdrop-blur-xl">
          <header className="relative mb-4">
            <div className="absolute right-0 top-0 z-10">
              <LanguageToggle />
            </div>
            <h1 className="px-2 text-center text-3xl font-light tracking-tight text-sea-950 sm:px-16 sm:text-4xl">
              {mode === "zh" ? (
                <span className="block">全能照片管家 · 照片整理</span>
              ) : (
                <>
                  <span className="block">OmniPhoto</span>
                  <span className="mt-2 block text-lg font-light text-sea-800/75 sm:text-xl">
                    Photo organizer
                  </span>
                </>
              )}
            </h1>
          </header>

          <div className="relative z-0">
            <div
              className="pointer-events-none absolute left-[8%] right-[8%] top-[48%] z-0 hidden -translate-y-1/2 sm:block"
              aria-hidden
            >
              <div className="h-12 w-full bg-gradient-to-r from-sea-500/0 via-white/30 to-sea-600/0 opacity-80 blur-xl" />
            </div>
            <div
              className="pointer-events-none absolute left-[12%] right-[12%] top-[48%] z-0 hidden h-[2px] -translate-y-1/2 sm:block"
              aria-hidden
            >
              <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 shadow-[0_0_20px_rgba(255,255,255,0.55)]" />
            </div>
            <div className="relative z-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-stretch">
              <DirectorySelector
                labelEn="Source Path"
                labelZh="待整理路径"
                placeholderEn="Choose folder to organize"
                placeholderZh="选择待整理的文件夹"
                value={sourceDir}
                onChange={setSourceDir}
                dropTargetId="source"
                dropTarget={dropTarget}
                onDropTargetChange={setDropTarget}
              />
              <FlowArrow flowActive={Boolean(sourceDir && targetDir)} />
              <DirectorySelector
                labelEn="Target Library"
                labelZh="目标路径"
                placeholderEn="Choose destination library"
                placeholderZh="选择目标归档库路径"
                value={targetDir}
                onChange={(path) => {
                  setTargetDir(path);
                  setDuplicatesFolderSize(null);
                }}
                dropTargetId="target"
                dropTarget={dropTarget}
                onDropTargetChange={setDropTarget}
              />
            </div>
          </div>

          {targetDir && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/20 bg-white/20 p-6 shadow-glass-sm backdrop-blur-md">
              <span className="text-sm text-sea-900/85">
                <BilingualInline
                  en="_Duplicates size"
                  zh="重复文件夹大小"
                  primaryClassName="font-medium text-sea-900"
                  secondaryClassName="text-xs font-normal text-sea-800/55"
                />
                <span className="mx-1 text-sea-800/40">·</span>
                <span className="tabular-nums text-sea-950">
                  {duplicatesFolderSize !== null ? formatBytes(duplicatesFolderSize) : "—"}
                </span>
              </span>
              <motion.button
                type="button"
                onClick={handleStatDuplicatesSize}
                disabled={duplicatesSizeLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                className="rounded-full border border-white/35 bg-white/35 px-3 py-1.5 text-sea-900 shadow-glass-sm backdrop-blur-sm disabled:opacity-50"
              >
                {duplicatesSizeLoading ? (
                  <BilingualButtonLabel
                    en="Measuring…"
                    zh="统计中…"
                    primaryClassName="text-xs font-medium"
                    secondaryClassName="text-[10px] text-sea-800/65"
                  />
                ) : (
                  <BilingualButtonLabel
                    en="Measure"
                    zh="统计"
                    primaryClassName="text-xs font-medium"
                    secondaryClassName="text-[10px] text-sea-800/65"
                  />
                )}
              </motion.button>
            </div>
          )}

          <div className="mt-4">
            <DedupeSettingsCard
              checked={compareWithArchive}
              onChange={setCompareWithArchive}
            />
          </div>

          <div className="mt-4">
            <ControlPanel
              isProcessing={isProcessing}
              onStart={handleStart}
              onCancel={handleCancel}
            />
          </div>

          {(isProcessing || progress) && (
            <div className="mt-4">
              <ProcessingStatus progress={progress} isProcessing={isProcessing} />
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs font-medium text-sea-800/70 underline-offset-4 transition-colors hover:text-sea-950 hover:underline"
            >
              {showAdvanced ? (
                <BilingualInline
                  en="Hide advanced"
                  zh="隐藏高级"
                  primaryClassName="text-sea-800/75"
                  secondaryClassName="text-[11px] text-sea-800/55"
                />
              ) : (
                <BilingualInline
                  en="Show advanced"
                  zh="显示高级"
                  primaryClassName="text-sea-800/75"
                  secondaryClassName="text-[11px] text-sea-800/55"
                />
              )}
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-4">
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
                    setLogs((prev) => [
                      ...prev,
                      mode === "zh" ? "高级设置已保存" : "Advanced settings saved.",
                    ]);
                  } catch (e) {
                    setLogs((prev) => [
                      ...prev,
                      mode === "zh" ? `保存失败：${e}` : `Save failed: ${e}`,
                    ]);
                  }
                }}
                isDirty={advancedDirty}
              />
            </div>
          )}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={() => setLogDrawerOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full border border-white/30 bg-white/38 px-3.5 py-2.5 text-sea-900 shadow-[0_10px_36px_-10px_rgba(14,32,52,0.4)] ring-1 ring-white/35 backdrop-blur-md"
        whileHover={{
          scale: 1.045,
          boxShadow:
            "0 16px 44px -8px rgba(14, 32, 52, 0.48), 0 0 0 1px rgba(255,255,255,0.35)",
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        aria-haspopup="dialog"
      >
        <ScrollText className="h-4 w-4 text-sea-700" strokeWidth={1.75} />
        <BilingualInline
          en="Activity log"
          zh="查看日志"
          primaryClassName="text-[11px] font-medium tracking-[0.06em] text-sea-900"
          secondaryClassName="text-[10px] font-normal tracking-[0.1em] text-sea-800/58"
        />
      </motion.button>

      <LocalFirstBadge />

      <LogDrawer open={logDrawerOpen} onClose={() => setLogDrawerOpen(false)} logs={logs} />

      <NoticeModal
        open={notice !== null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />

      {resultData && (
        <ArchiveResultModal
          open={resultOpen}
          onClose={() => {
            setResultOpen(false);
            setResultData(null);
          }}
          archivePath={resultData.archivePath}
          stats={resultData.stats}
          formatBytes={formatBytes}
        />
      )}
    </div>
  );
}

export default App;
