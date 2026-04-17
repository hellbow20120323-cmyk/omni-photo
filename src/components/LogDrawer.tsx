import { AnimatePresence, motion } from "framer-motion";
import { PanelRightClose, ScrollText } from "lucide-react";
import { useDisplayMode } from "../context/DisplayModeContext";
import { BilingualInline } from "./Bilingual";

interface LogDrawerProps {
  open: boolean;
  onClose: () => void;
  logs: string[];
}

const springPanel = { type: "spring" as const, stiffness: 360, damping: 34 };
const springOverlay = { type: "spring" as const, stiffness: 280, damping: 36 };
const springLine = { type: "spring" as const, stiffness: 320, damping: 30 };

function LogLine({ text, index }: { text: string; index: number }) {
  return (
    <motion.div
      className="border-b border-white/12 py-2 last:border-0"
      initial={{ opacity: 0, x: -14, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{
        ...springLine,
        delay: Math.min(index * 0.035, 0.45),
      }}
    >
      {text}
    </motion.div>
  );
}

export default function LogDrawer({ open, onClose, logs }: LogDrawerProps) {
  const { mode } = useDisplayMode();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="log-drawer-backdrop"
            type="button"
            aria-label={mode === "zh-only" ? "关闭日志" : "Close log panel"}
            className="fixed inset-0 z-[60] bg-sea-950/20"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springOverlay}
            onClick={onClose}
          />
          <motion.aside
            key="log-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-drawer-title"
            className="fixed right-0 top-0 z-[70] flex h-full w-[min(100vw,420px)] flex-col border-l border-white/20 bg-white/28 shadow-glass"
            style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={springPanel}
          >
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
              <h2 id="log-drawer-title" className="flex items-center gap-2 text-sm font-medium text-sea-900">
                <ScrollText className="h-4 w-4 text-sea-700" strokeWidth={1.75} />
                <BilingualInline
                  en="Activity log"
                  zh="活动日志"
                  primaryClassName="text-sea-900 tracking-[0.02em]"
                  secondaryClassName="text-xs text-sea-800/60 tracking-wide"
                />
              </h2>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 480, damping: 28 }}
                className="rounded-full border border-white/25 bg-white/22 p-2 text-sea-800 backdrop-blur-sm"
              >
                <PanelRightClose className="h-4 w-4" strokeWidth={1.75} />
              </motion.button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="font-mono text-[11px] leading-relaxed tracking-[0.01em] text-sea-900/88">
                {logs.length === 0 ? (
                  <motion.p
                    className="text-sea-700/50"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={springLine}
                  >
                    {mode === "zh-only" ? "暂无记录" : "No entries yet."}
                  </motion.p>
                ) : (
                  logs.map((line, i) => <LogLine key={`${i}-${line}`} text={line} index={i} />)
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
