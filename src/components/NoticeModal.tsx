import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useDisplayMode } from "../context/DisplayModeContext";

const spring = { type: "spring" as const, stiffness: 420, damping: 34 };

interface NoticeModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function NoticeModal({ open, title, message, onClose }: NoticeModalProps) {
  const { mode } = useDisplayMode();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[85] bg-sea-950/35 backdrop-blur-md"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="notice-title"
              className="pointer-events-auto w-full max-w-[min(calc(100vw-2rem),400px)] rounded-2xl border border-white/25 bg-white/45 p-5 shadow-glass backdrop-blur-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={spring}
            >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 id="notice-title" className="pr-6 text-base font-medium text-sea-950">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/20 p-1.5 text-sea-800 hover:bg-white/30"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-sea-900/88">
              {message}
            </pre>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-full border border-white/25 bg-sea-800/90 py-2.5 text-sm font-medium text-white shadow-glass-sm backdrop-blur-sm transition-colors hover:bg-sea-800"
            >
              {mode === "zh" ? "好的" : "OK"}
            </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
