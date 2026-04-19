import { useDisplayMode } from "../context/DisplayModeContext";

/** Segmented control: 中文 | English */
export default function LanguageToggle() {
  const { mode, setMode } = useDisplayMode();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-white/25 bg-white/20 p-0.5 shadow-glass-sm backdrop-blur-md"
      role="group"
      aria-label={mode === "zh" ? "界面语言" : "Interface language"}
    >
      <button
        type="button"
        onClick={() => setMode("zh")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
          mode === "zh"
            ? "bg-white/50 text-sea-950 shadow-sm"
            : "text-sea-800/70 hover:bg-white/25"
        }`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setMode("en")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
          mode === "en"
            ? "bg-white/50 text-sea-950 shadow-sm"
            : "text-sea-800/70 hover:bg-white/25"
        }`}
      >
        English
      </button>
    </div>
  );
}
