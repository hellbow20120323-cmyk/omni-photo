import { useId } from "react";
import { motion } from "framer-motion";
import { BilingualStack } from "./Bilingual";

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

interface ProcessingStatusProps {
  progress: ProgressInfo | null;
  isProcessing: boolean;
}

function emotionalLine(progress: ProgressInfo | null): { en: string; zh: string } {
  const pct =
    progress && progress.total > 0 ? progress.current / progress.total : 0;
  const phases: { en: string; zh: string }[] = [
    { en: "Curating your memories…", zh: "正在为您整理美好回忆…" },
    { en: "Sorting moments with care…", zh: "细心为回忆分类归档…" },
    { en: "Almost there — breathing room…", zh: "快好了，请再稍候片刻…" },
  ];
  const idx = Math.min(phases.length - 1, Math.floor(pct * phases.length));
  return phases[idx];
}

export default function ProcessingStatus({ progress, isProcessing }: ProcessingStatusProps) {
  const ringGradientId = useId().replace(/:/g, "");
  if (!isProcessing && !progress) return null;

  const indeterminate = isProcessing && (!progress || progress.total === 0);
  const pct =
    progress && progress.total > 0
      ? Math.min(100, (progress.current / progress.total) * 100)
      : 0;
  const line = emotionalLine(progress);

  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = indeterminate ? c * 0.22 : (pct / 100) * c;

  return (
    <motion.div
      className="glass-panel-subtle rounded-2xl border border-white/20 p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 32 }}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
        <div className="relative h-[108px] w-[108px] shrink-0">
          <svg className="-rotate-90 transform" width="108" height="108" viewBox="0 0 108 108">
            <circle
              cx="54"
              cy="54"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="6"
            />
            <motion.circle
              cx="54"
              cy="54"
              r={r}
              fill="none"
              stroke={`url(#omni-ring-${ringGradientId})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={indeterminate ? `${c * 0.2} ${c * 0.8}` : `${dash} ${c - dash}`}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: indeterminate ? -c * 0.45 : 0 }}
              transition={
                indeterminate
                  ? {
                      type: "spring",
                      stiffness: 26,
                      damping: 12,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }
                  : { type: "spring", stiffness: 120, damping: 22 }
              }
            />
            <defs>
              <linearGradient id={`omni-ring-${ringGradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2c4460" />
                <stop offset="100%" stopColor="#4d6d8f" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-light tabular-nums text-sea-950">
              {indeterminate ? "—" : `${Math.round(pct)}%`}
            </span>
            {progress && progress.total > 0 && (
              <span className="text-[10px] text-sea-800/55">
                {progress.current} / {progress.total}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-base font-light leading-snug text-sea-950 sm:text-lg">
            <BilingualStack
              en={line.en}
              zh={line.zh}
              primaryClassName="text-sea-950"
              secondaryClassName="text-sm font-normal text-sea-800/65 mt-1"
            />
          </p>
          {progress?.message && (
            <p className="mt-2 truncate text-xs text-sea-800/55" title={progress.message}>
              {progress.message}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-5 h-2 overflow-hidden rounded-full border border-white/20 bg-white/25">
        {!indeterminate ? (
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sea-800 to-sea-600/90"
            initial={false}
            animate={{ width: `${Math.max(5, pct)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
          />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-[42%] rounded-full bg-gradient-to-r from-sea-800/95 to-sea-600/85 shadow-sm"
            initial={{ left: "-35%" }}
            animate={{ left: "72%" }}
            transition={{
              type: "spring",
              stiffness: 16,
              damping: 14,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
