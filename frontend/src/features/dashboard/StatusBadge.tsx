import { AnimatePresence, motion } from "motion/react";

import type { AppointmentStatus } from "../../lib/types";
import { STATUS_LABELS, STATUS_STYLES } from "./status";

/** Cross-fades when the status changes (e.g. after an optimistic update). */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className="relative inline-grid">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status].badge}`}
        >
          <span
            className={`size-1.5 rounded-full ${STATUS_STYLES[status].dot}`}
            aria-hidden="true"
          />
          {STATUS_LABELS[status]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
