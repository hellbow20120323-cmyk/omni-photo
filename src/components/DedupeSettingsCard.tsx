import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { BilingualStack } from "./Bilingual";
import { useDisplayMode } from "../context/DisplayModeContext";

const spring = { type: "spring" as const, stiffness: 420, damping: 32 };
const springToggle = { type: "spring" as const, stiffness: 520, damping: 34 };

interface DedupeSettingsCardProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function GlassSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[46px] shrink-0 rounded-full p-0.5 shadow-inner transition-colors ${
        checked ? "bg-sea-600" : "bg-morandi-400/85"
      }`}
    >
      <motion.span
        className="block h-6 w-6 rounded-full bg-white shadow-md"
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={springToggle}
      />
    </button>
  );
}

export default function DedupeSettingsCard({ checked, onChange }: DedupeSettingsCardProps) {
  const { mode } = useDisplayMode();
  const infoTip =
    mode === "zh"
      ? "开启：对比归档库内已有文件，重复内容进 _Duplicates。关闭：仅本批文件内部去重，不比对库内旧文件。"
      : "On: compares with the existing archive; duplicates go to _Duplicates. Off: dedupe only within this batch; the archive is not scanned.";

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/22 bg-white/16 p-6 shadow-glass-sm backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className="mt-0.5 inline-flex shrink-0 rounded-full border border-white/25 bg-white/20 p-1.5 text-sea-700"
            title={infoTip}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={1.85} aria-hidden />
          </span>
          <div className="min-w-0">
            <label htmlFor="dedupe-switch" className="cursor-pointer">
              <BilingualStack
                en="Compare archive for deduping"
                zh="对比归档库去重"
                primaryClassName="text-[13px] font-medium tracking-[0.02em] text-sea-950"
                secondaryClassName="mt-0.5 text-[11px] font-normal tracking-wide text-sea-800/65"
              />
            </label>
            <div className="mt-4 space-y-4 text-[11px] leading-relaxed">
              <BilingualStack
                en="On: Automatically compares with files already in the library. If content is duplicate, files are placed in the _Duplicates folder—no redundant copies in the main archive."
                zh="开启：自动对比库内已有文件。若内容重复，将复制到 _Duplicates 文件夹，不重复存储。"
                primaryClassName="text-sea-800/88"
                secondaryClassName="text-[11px] text-sea-800/72 mt-1 leading-relaxed"
              />
              <BilingualStack
                en="Off: Dedupes only within this batch of files to organize; does not compare with older files already in the archive."
                zh="关闭：仅对本次待整理的文件进行内部去重，不比对库内旧文件。"
                primaryClassName="text-sea-800/85"
                secondaryClassName="text-[11px] text-sea-800/68 mt-1 leading-relaxed"
              />
            </div>
          </div>
        </div>
        <GlassSwitch id="dedupe-switch" checked={checked} onChange={onChange} />
      </div>
    </motion.div>
  );
}
