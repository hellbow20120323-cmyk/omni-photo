import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderTree, X } from "lucide-react";
import { BilingualInline, BilingualStack } from "./Bilingual";
import { useDisplayMode } from "../context/DisplayModeContext";
import { buildDirectoryTreeLines } from "../lib/dirPreviewTree";
import { middleTruncatePath } from "../lib/middleTruncate";

const spring = { type: "spring" as const, stiffness: 400, damping: 32 };

export interface ResultStats {
  photos: number;
  videos: number;
  others: number;
  duplicates: number;
  errors: number;
  processed: number;
  total_duplicate_size: number;
  /** Archive-relative directory paths written this run (from Rust). */
  directory_preview: string[];
  directory_preview_truncated: boolean;
}

interface ArchiveResultModalProps {
  open: boolean;
  onClose: () => void;
  archivePath: string;
  stats: ResultStats;
  formatBytes: (n: number) => string;
}

function archiveDisplayName(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "Archive";
}

export default function ArchiveResultModal({
  open,
  onClose,
  archivePath,
  stats,
  formatBytes,
}: ArchiveResultModalProps) {
  const { mode } = useDisplayMode();
  const name = archiveDisplayName(archivePath);

  const treeText = useMemo(() => {
    const paths = stats.directory_preview ?? [];
    const lines = buildDirectoryTreeLines(name, paths);
    return lines.join("\n");
  }, [stats.directory_preview, name]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[85] bg-sea-950/30 backdrop-blur-md"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="result-title"
              className="pointer-events-auto max-h-[min(90vh,640px)] w-full max-w-[min(calc(100vw-2rem),440px)] overflow-y-auto rounded-2xl border border-white/25 bg-white/45 p-6 shadow-glass backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={spring}
            >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/25">
                  <FolderTree className="h-5 w-5 text-sea-700" strokeWidth={1.5} />
                </div>
                <h2 id="result-title" className="text-base font-medium text-sea-950">
                  <BilingualInline
                    en="Archive ready"
                    zh="整理完成"
                    primaryClassName="font-medium text-sea-950"
                    secondaryClassName="text-sm font-normal text-sea-800/65"
                  />
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/20 p-1.5 text-sea-800 hover:bg-white/30"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <p className="mb-4 text-xs text-sea-800/70" title={archivePath}>
              {middleTruncatePath(archivePath, 56)}
            </p>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sea-800/55">
                <BilingualInline
                  en="Layout preview (this run)"
                  zh="目录结构预览（本次写入）"
                  primaryClassName="text-sea-800/70"
                  secondaryClassName="text-[11px] text-sea-800/50"
                />
              </p>
              <pre
                className="max-h-[min(40vh,280px)] overflow-x-auto overflow-y-auto rounded-xl border border-white/20 bg-sea-950/[0.06] p-4 font-mono text-[11px] leading-relaxed text-sea-900/90"
                tabIndex={0}
              >
                {treeText}
              </pre>
              {stats.directory_preview_truncated && (
                <p className="mt-2 text-center text-[11px] text-amber-900/80">
                  {mode === "zh"
                    ? "目录较多，仅显示前 400 个不重复路径。"
                    : "Many folders — only the first 400 unique paths are shown."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Photos"
                  zh="照片"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-sea-950">{stats.photos}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Videos"
                  zh="视频"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-sea-950">{stats.videos}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Other"
                  zh="其他"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-sea-950">{stats.others}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Duplicates"
                  zh="重复"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-sea-950">{stats.duplicates}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Processed"
                  zh="已归档"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-sea-950">{stats.processed}</div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/20 px-3 py-2">
                <BilingualStack
                  en="Errors"
                  zh="错误"
                  primaryClassName="text-xs text-sea-800/70"
                  secondaryClassName="text-[10px] text-sea-800/50"
                />
                <div className="text-lg font-light tabular-nums text-rose-800/90">{stats.errors}</div>
              </div>
            </div>

            {stats.total_duplicate_size > 0 && (
              <p className="mt-3 text-center text-xs text-sea-800/75">
                {mode === "zh"
                  ? `重复文件体积：${formatBytes(stats.total_duplicate_size)}`
                  : `Duplicate data size: ${formatBytes(stats.total_duplicate_size)}`}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full border border-white/25 bg-gradient-to-r from-sea-800 to-sea-700 py-3 text-sm font-medium text-white/95 shadow-glass-sm backdrop-blur-sm transition-opacity hover:opacity-95"
            >
              {mode === "zh" ? "好的" : "Done"}
            </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
