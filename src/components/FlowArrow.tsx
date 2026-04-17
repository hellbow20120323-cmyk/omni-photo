import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const springDrift = { type: "spring" as const, stiffness: 22, damping: 14, repeat: Infinity, repeatType: "reverse" as const };
const springReset = { type: "spring" as const, stiffness: 400, damping: 34 };
const springBreath = { type: "spring" as const, stiffness: 95, damping: 13, repeat: Infinity, repeatType: "reverse" as const };

interface FlowArrowProps {
  /** Both paths set — gentle horizontal drift */
  flowActive: boolean;
}

export default function FlowArrow({ flowActive }: FlowArrowProps) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 self-center px-1 py-2 sm:px-2 sm:py-0">
      <motion.div
        animate={{ x: flowActive ? 12 : 0 }}
        transition={flowActive ? springDrift : springReset}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ scale: 1.06 }}
          transition={springBreath}
          className="flex h-11 w-11 rotate-90 items-center justify-center rounded-full border border-white/30 bg-white/25 text-sea-700 shadow-glass-sm backdrop-blur-md sm:rotate-0"
        >
          <ArrowRight className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </motion.div>
      </motion.div>
    </div>
  );
}
