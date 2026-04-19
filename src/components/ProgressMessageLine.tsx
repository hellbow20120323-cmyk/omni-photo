import { middleTruncatePath } from "../lib/middleTruncate";

const monoName = "font-mono text-[13px] font-bold text-sea-950";
const prefixClass = "text-xs text-sea-800/70";

/** Highlights filenames in backend progress lines with SF Mono stack + bold. */
export default function ProgressMessageLine({ message }: { message: string }) {
  const processed = /^Processed:\s*(.+?)\s*→\s*(.+)$/.exec(message);
  if (processed) {
    const [, filename, dest] = processed;
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed">
        <span className={prefixClass}>Processed: </span>
        <span className={`${monoName} align-baseline`}>{filename}</span>
        <span className={prefixClass}> → {dest}</span>
      </p>
    );
  }

  const dup = /^\[Duplicate\] Copied to _Duplicates:\s*(.+)$/.exec(message);
  if (dup) {
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed">
        <span className={prefixClass}>[Duplicate] Copied to _Duplicates: </span>
        <span className={`${monoName} align-baseline`}>{dup[1]}</span>
      </p>
    );
  }

  const dupFail = /^Duplicate copy failed:\s*(.+?)\s*-\s*(.+)$/.exec(message);
  if (dupFail) {
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed">
        <span className={prefixClass}>Duplicate copy failed: </span>
        <span className={`${monoName} align-baseline`}>{dupFail[1]}</span>
        <span className={prefixClass}> — {dupFail[2]}</span>
      </p>
    );
  }

  const failed = /^Failed:\s*(.+?)\s*-\s*(.+)$/.exec(message);
  if (failed) {
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed">
        <span className={prefixClass}>Failed: </span>
        <span className={`${monoName} align-baseline`}>{failed[1]}</span>
        <span className={prefixClass}> — {failed[2]}</span>
      </p>
    );
  }

  const skipped = /^Skipped unreadable file:\s*(.+)$/.exec(message);
  if (skipped) {
    const display = middleTruncatePath(skipped[1], 64);
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed" title={message}>
        <span className={prefixClass}>Skipped unreadable file: </span>
        <span className={`${monoName} align-baseline`}>{display}</span>
      </p>
    );
  }

  const dateErr = /^Could not read file date:\s*(.+)$/.exec(message);
  if (dateErr) {
    const display = middleTruncatePath(dateErr[1], 64);
    return (
      <p className="mt-2 min-w-0 text-left text-xs leading-relaxed" title={message}>
        <span className={prefixClass}>Could not read file date: </span>
        <span className={`${monoName} align-baseline`}>{display}</span>
      </p>
    );
  }

  return (
    <p className="mt-2 min-w-0 truncate text-xs text-sea-800/70" title={message}>
      {message}
    </p>
  );
}
