/** English-primary, Chinese-secondary UI copy helpers (respects Display mode). */

import { useDisplayMode } from "../context/DisplayModeContext";

type InlineProps = {
  en: string;
  zh: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

/** Same line: English prominent, Chinese smaller and muted — or Chinese only */
export function BilingualInline({
  en,
  zh,
  className = "",
  primaryClassName = "font-medium text-gray-900",
  secondaryClassName = "text-sm font-normal text-gray-500",
}: InlineProps) {
  const { mode } = useDisplayMode();
  if (mode === "zh-only") {
    return (
      <span className={`inline-flex flex-wrap items-baseline ${className}`}>
        <span className={primaryClassName}>{zh}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className={primaryClassName}>{en}</span>
      <span className={secondaryClassName}>{zh}</span>
    </span>
  );
}

type StackProps = {
  en: string;
  zh: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

/** Two lines: English on top, Chinese below — or merged Chinese only */
export function BilingualStack({
  en,
  zh,
  className = "",
  primaryClassName = "",
  secondaryClassName = "text-sm font-normal text-gray-500 mt-0.5",
}: StackProps) {
  const { mode } = useDisplayMode();
  if (mode === "zh-only") {
    const merged = [primaryClassName, secondaryClassName.replace(/\s*mt-0\.5\s*/g, " ").trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    const zhClass = merged || "font-medium text-gray-800";
    return (
      <span className={`inline-flex flex-col items-start text-left ${className}`}>
        <span className={zhClass}>{zh}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col items-start text-left ${className}`}>
      <span className={primaryClassName}>{en}</span>
      <span className={secondaryClassName}>{zh}</span>
    </span>
  );
}

type ButtonStackProps = {
  en: string;
  zh: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

/** Compact vertical pair for primary actions — or Chinese only */
export function BilingualButtonLabel({
  en,
  zh,
  primaryClassName = "leading-tight",
  secondaryClassName = "text-[11px] font-normal opacity-90 leading-tight",
}: ButtonStackProps) {
  const { mode } = useDisplayMode();
  if (mode === "zh-only") {
    return (
      <span className="flex flex-col items-center justify-center">
        <span className={primaryClassName}>{zh}</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center justify-center gap-0.5">
      <span className={primaryClassName}>{en}</span>
      <span className={secondaryClassName}>{zh}</span>
    </span>
  );
}
