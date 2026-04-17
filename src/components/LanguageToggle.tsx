import { motion } from "framer-motion";
import { BilingualInline } from "./Bilingual";
import { useDisplayMode } from "../context/DisplayModeContext";

/** iOS-style compact toggle; spring thumb */
export default function LanguageToggle() {
  const { mode, setMode } = useDisplayMode();
  const on = mode === "bilingual";

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-2.5 py-1.5 shadow-glass-sm backdrop-blur-md"
      role="group"
      aria-label={on ? "Bilingual UI" : "Chinese-only UI"}
    >
      {on ? (
        <BilingualInline
          en="EN"
          zh="中"
          primaryClassName="text-[11px] font-medium text-sea-900/85"
          secondaryClassName="text-[11px] text-sea-800/55"
        />
      ) : (
        <span className="text-[11px] font-medium text-sea-900/85">中文</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? "Switch to Chinese only" : "Show English and Chinese"}
        onClick={() => setMode(on ? "zh-only" : "bilingual")}
        className={`relative h-[22px] w-[40px] shrink-0 rounded-full p-0.5 shadow-inner transition-colors ${
          on ? "bg-sea-600" : "bg-morandi-400/80"
        }`}
      >
        <motion.span
          className="block h-[18px] w-[18px] rounded-full bg-white shadow-md"
          initial={false}
          animate={{ x: on ? 18 : 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        />
      </button>
    </div>
  );
}
