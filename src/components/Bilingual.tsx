/** Single-language copy: shows `zh` or `en` based on Display mode (never mixed). */

import { useDisplayMode } from "../context/DisplayModeContext";

type InlineProps = {
  en: string;
  zh: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

export function BilingualInline({
  en,
  zh,
  className = "",
  primaryClassName = "font-medium text-gray-900",
  secondaryClassName: _secondaryClassName = "text-sm font-normal text-gray-500",
}: InlineProps) {
  const { mode } = useDisplayMode();
  const text = mode === "zh" ? zh : en;
  return (
    <span className={`inline-flex flex-wrap items-baseline ${className}`}>
      <span className={primaryClassName}>{text}</span>
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

export function BilingualStack({
  en,
  zh,
  className = "",
  primaryClassName = "",
  secondaryClassName: _secondaryClassName = "text-sm font-normal text-gray-500 mt-0.5",
}: StackProps) {
  const { mode } = useDisplayMode();
  const text = mode === "zh" ? zh : en;
  const cls = primaryClassName || "font-medium text-gray-800";
  return (
    <span className={`inline-flex flex-col items-start text-left ${className}`}>
      <span className={cls}>{text}</span>
    </span>
  );
}

type ButtonStackProps = {
  en: string;
  zh: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

export function BilingualButtonLabel({
  en,
  zh,
  primaryClassName = "leading-tight",
  secondaryClassName: _secondaryClassName = "text-[11px] font-normal opacity-90 leading-tight",
}: ButtonStackProps) {
  const { mode } = useDisplayMode();
  const text = mode === "zh" ? zh : en;
  return (
    <span className="flex flex-col items-center justify-center">
      <span className={primaryClassName}>{text}</span>
    </span>
  );
}
