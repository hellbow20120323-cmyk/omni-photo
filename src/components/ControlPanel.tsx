import { motion } from "framer-motion";
import { BilingualButtonLabel } from "./Bilingual";

const springBtn = { type: "spring" as const, stiffness: 440, damping: 30 };

interface ControlPanelProps {
  isProcessing: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export default function ControlPanel({ isProcessing, onStart, onCancel }: ControlPanelProps) {
  return (
    <div className="flex justify-center pt-1">
      {isProcessing ? (
        <motion.button
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={springBtn}
          className="min-w-[200px] rounded-full border border-rose-300/40 bg-gradient-to-r from-rose-900/85 to-rose-800/80 px-10 py-3 text-white shadow-glass-sm backdrop-blur-md"
        >
          <BilingualButtonLabel
            en="Cancel"
            zh="取消"
            primaryClassName="text-sm font-medium tracking-[0.04em]"
            secondaryClassName="text-[11px] font-normal tracking-[0.12em] text-white/88"
          />
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 22px 48px -10px rgba(12, 30, 52, 0.52), 0 10px 24px -12px rgba(30, 60, 90, 0.35)",
          }}
          whileTap={{ scale: 0.985 }}
          transition={springBtn}
          className="min-w-[268px] rounded-full border border-white/28 bg-gradient-to-r from-sea-900 via-sea-800 to-sea-700 px-12 py-3.5 text-white shadow-[0_12px_36px_-12px_rgba(12,30,52,0.45)] backdrop-blur-md"
        >
          <BilingualButtonLabel
            en="Start organizing"
            zh="开始整理"
            primaryClassName="text-[15px] font-medium tracking-[0.08em]"
            secondaryClassName="text-[11px] font-normal tracking-[0.14em] text-white/88"
          />
        </motion.button>
      )}
    </div>
  );
}
