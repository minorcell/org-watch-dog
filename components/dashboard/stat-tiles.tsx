"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function StatTiles({ children }: { children: ReactNode }) {
  return (
    <motion.section
      className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Star 摘要"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={fadeUp}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.section>
  );
}
