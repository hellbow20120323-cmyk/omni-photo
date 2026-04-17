import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { useDisplayMode } from "../context/DisplayModeContext";
import { BilingualStack, BilingualInline } from "./Bilingual";

const spring = { type: "spring" as const, stiffness: 400, damping: 32 };

export default function LocalFirstBadge() {
  const { mode } = useDisplayMode();
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex max-w-[min(calc(100vw-2rem),200px)] items-center gap-2 rounded-full border border-white/25 bg-white/30 px-3 py-2 text-left shadow-glass-sm backdrop-blur-md transition-colors hover:bg-white/45"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 480, damping: 28 }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          mode === "zh-only"
            ? "查看安全与隐私说明"
            : "Open safety and privacy information"
        }
      >
        <Lock className="h-4 w-4 shrink-0 text-sea-700" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 text-[11px] font-medium leading-snug tracking-wide text-sea-900/90">
          {mode === "zh-only" ? (
            "安全与隐私"
          ) : (
            <span className="flex flex-col leading-tight">
              <span>Safety & privacy</span>
              <span className="text-[10px] font-normal text-sea-800/55">安全与隐私</span>
            </span>
          )}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[80] bg-sea-950/30 backdrop-blur-md"
              aria-label={mode === "zh-only" ? "关闭" : "Close"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 36 }}
              onClick={() => setOpen(false)}
            />
            {/* flex居中：避免 motion 的 transform 覆盖 -translate-x-1/2 导致弹窗偏右 */}
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
              role="presentation"
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="privacy-sheet-title"
                className="pointer-events-auto w-full max-w-[min(calc(100vw-2rem),400px)] rounded-2xl border border-white/25 bg-white/40 p-6 shadow-glass backdrop-blur-2xl"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={spring}
              >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/25">
                    <Lock className="h-5 w-5 text-sea-700" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <h2 id="privacy-sheet-title" className="text-base font-medium text-sea-950">
                      <BilingualInline
                        en="Safety & privacy"
                        zh="安全与隐私"
                        primaryClassName="font-medium text-sea-950"
                        secondaryClassName="text-sm font-normal text-sea-800/65"
                      />
                    </h2>
                    <p className="mt-0.5 text-xs font-normal text-sea-800/55">
                      <BilingualInline
                        en="What OmniPhoto does with your files"
                        zh="整理时，应用具体会做什么"
                        primaryClassName="text-sea-800/65"
                        secondaryClassName="text-[11px] text-sea-800/50"
                      />
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/20 p-1.5 text-sea-800 hover:bg-white/30"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <section className="rounded-xl border border-white/15 bg-white/15 px-3.5 py-3">
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sea-800/70">
                    <BilingualInline
                      en="Copy only"
                      zh="只做复制"
                      primaryClassName="text-sea-800/75"
                      secondaryClassName="text-[10px] font-normal normal-case tracking-normal text-sea-800/55"
                    />
                  </h3>
                  <BilingualStack
                    en="Files are copied into your archive using a fixed folder layout. Nothing in the source folder is deleted or moved by the app—you stay in control of the originals."
                    zh="应用只会把文件复制到归档库里，并按规则放进子文件夹。待整理路径里的原件不会被自动删除或挪走，是否保留仍由您决定。"
                    primaryClassName="text-[13px] text-sea-900/92"
                    secondaryClassName="text-xs text-sea-800/72 mt-1.5 leading-relaxed"
                  />
                </section>

                <section className="rounded-xl border border-white/15 bg-white/15 px-3.5 py-3">
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sea-800/70">
                    <BilingualInline
                      en="On this Mac"
                      zh="只在本机"
                      primaryClassName="text-sea-800/75"
                      secondaryClassName="text-[10px] font-normal normal-case tracking-normal text-sea-800/55"
                    />
                  </h3>
                  <BilingualStack
                    en="Fingerprinting and deduping run entirely on your Mac. Your photos and paths are not uploaded to our servers."
                    zh="去重用的指纹计算、读写目录等都在您的 Mac 上完成，照片与路径不会上传到我们的服务器。"
                    primaryClassName="text-[13px] text-sea-900/92"
                    secondaryClassName="text-xs text-sea-800/72 mt-1.5 leading-relaxed"
                  />
                </section>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
