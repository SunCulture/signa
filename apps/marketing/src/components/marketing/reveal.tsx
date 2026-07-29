"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  initialVisible = false,
  distance = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  initialVisible?: boolean;
  distance?: number;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? undefined : { opacity: 0, y: distance };
  const visible = { opacity: 1, y: 0 };
  const transition = {
    delay: reduceMotion ? 0 : delay / 1000,
    duration: reduceMotion ? 0 : 0.65,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <motion.div
      initial={hidden}
      animate={initialVisible ? visible : undefined}
      whileInView={initialVisible ? undefined : visible}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -8% 0px" }}
      transition={transition}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
