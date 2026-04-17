import { useState } from "react";
import { motion } from "framer-motion";
import { open } from "@tauri-apps/api/dialog";
import { FolderOpen } from "lucide-react";
import { useDisplayMode } from "../context/DisplayModeContext";
import { BilingualInline, BilingualButtonLabel } from "./Bilingual";

type DropTargetId = "source" | "target";

interface DirectorySelectorProps {
  labelEn: string;
  labelZh: string;
  placeholderEn: string;
  placeholderZh: string;
  value: string;
  onChange: (path: string) => void;
  dropTargetId?: DropTargetId;
  dropTarget?: DropTargetId | null;
  onDropTargetChange?: (id: DropTargetId | null) => void;
}

export default function DirectorySelector({
  labelEn,
  labelZh,
  placeholderEn,
  placeholderZh,
  value,
  onChange,
  dropTargetId,
  dropTarget,
  onDropTargetChange,
}: DirectorySelectorProps) {
  const { mode } = useDisplayMode();
  const [isDragging, setIsDragging] = useState(false);
  const isActiveDropTarget = dropTargetId != null && dropTarget === dropTargetId;
  const lifted = isDragging || isActiveDropTarget;

  const handleSelect = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: mode === "bilingual" ? `${labelEn} · ${labelZh}` : labelZh,
    });

    if (selected && typeof selected === "string") {
      onChange(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (dropTargetId != null) onDropTargetChange?.(dropTargetId);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    if (dropTargetId != null) onDropTargetChange?.(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onDropTargetChange?.(null);
  };

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-sea-800/55">
        <BilingualInline
          en={labelEn}
          zh={labelZh}
          primaryClassName="text-sea-900/90"
          secondaryClassName="text-[11px] font-normal normal-case tracking-normal text-sea-800/50"
        />
      </label>
      <motion.div
        animate={{
          scale: lifted ? 1.02 : 1,
          borderColor: lifted ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
        }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className={`rounded-[22px] border bg-white/25 p-4 shadow-glass-sm backdrop-blur-md sm:p-5 ${
          lifted ? "shadow-glass ring-1 ring-white/35" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <FolderOpen
              className="mt-0.5 h-4 w-4 shrink-0 text-sea-700/80"
              strokeWidth={1.75}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {value ? (
                <p className="text-sm font-light leading-snug text-sea-950 truncate" title={value}>
                  {value}
                </p>
              ) : (
                <p className="text-sm font-light leading-snug">
                  <BilingualInline
                    en={placeholderEn}
                    zh={placeholderZh}
                    primaryClassName="text-sea-900/85"
                    secondaryClassName="text-xs font-normal text-sea-800/55"
                  />
                </p>
              )}
            </div>
          </div>
          <motion.button
            type="button"
            onClick={handleSelect}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="shrink-0 rounded-full border border-white/35 bg-white/30 px-4 py-2 text-sea-900 shadow-glass-sm backdrop-blur-sm hover:bg-white/45"
          >
            <BilingualButtonLabel
              en="Browse…"
              zh="浏览…"
              primaryClassName="text-xs font-medium"
              secondaryClassName="text-[10px] font-normal text-sea-800/65"
            />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
