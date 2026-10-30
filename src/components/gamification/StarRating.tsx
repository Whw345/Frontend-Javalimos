"use client";

import { motion, useReducedMotion } from "motion/react";
import { Star } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE, STAGGER } from "@/styles/motion";

const MAX_STARS = 3;

interface StarRatingProps {
  stars: number;
  className?: string;
}

/** 0–3 estrellas que aparecen una por una (§7.2 "Fin de reto"). */
export function StarRating({ stars, className }: StarRatingProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div role="img" aria-label={copy.result.starsAria(stars)} className={cn("flex gap-3", className)}>
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const filled = index < stars;
        return (
          <motion.span
            key={index}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * STAGGER, duration: DURATION.slow, ease: EASE.spring }}
          >
            <Star
              aria-hidden
              className={cn(
                "size-12 lg:size-14",
                filled ? "fill-reward text-reward" : "fill-surface-sunken text-border-strong",
              )}
            />
          </motion.span>
        );
      })}
    </div>
  );
}
