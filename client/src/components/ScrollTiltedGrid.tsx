/**
 * ScrollTiltedGrid — 21.dev editorial scroll component adapted for proof images.
 * Tiles rise from below tipped forward, settle into focus, then tilt back out.
 * Respects prefers-reduced-motion.
 */
"use client";

import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  cubicBezier,
} from "framer-motion";
import { useMemo, useRef } from "react";

const easeIntoFocus  = cubicBezier(0.22, 1, 0.36, 1);
const easeOutOfFocus = cubicBezier(0, 0, 0.58, 1);
const focusEase: [typeof easeIntoFocus, typeof easeOutOfFocus] = [easeIntoFocus, easeOutOfFocus];

type Side = "L" | "R";

type TileConfig = {
  aspectRatio: string;
  perspective: number;
  maxTilt: number;
  maxBlur: number;
  rounded: string;
};

function Tile({ src, side, config, caption, dayNumber, onExpand }: {
  src: string;
  side: Side;
  config: TileConfig;
  caption?: string;
  dayNumber?: number;
  onExpand?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const reduce = useReducedMotion();
  const sign = side === "L" ? -1 : 1;
  const { aspectRatio, perspective, maxTilt, maxBlur, rounded } = config;

  const blur     = useTransform(p, [0, 0.5, 1], [maxBlur, 0, maxBlur],  { ease: focusEase });
  const bright   = useTransform(p, [0, 0.5, 1], [0, 1, 0],              { ease: focusEase });
  const contrast = useTransform(p, [0, 0.5, 1], [4, 1, 4],              { ease: focusEase });
  const ty       = useTransform(p, [0, 0.5, 1], ["100%", "0%", "-100%"],{ ease: focusEase });
  const tz       = useTransform(p, [0, 0.5, 1], [300, 0, 300],          { ease: focusEase });
  const rx       = useTransform(p, [0, 0.5, 1], [maxTilt, 0, -maxTilt], { ease: focusEase });
  const tx       = useTransform(p, [0, 0.5, 1], [`${sign * 40}%`, "0%", `${sign * 40}%`], { ease: focusEase });
  const rot      = useTransform(p, [0, 0.5, 1], [-sign * 5, 0, sign * 5],   { ease: focusEase });
  const sk       = useTransform(p, [0, 0.5, 1], [sign * 20, 0, -sign * 20], { ease: focusEase });
  const innerSY  = useTransform(p, [0, 0.5, 1], [1.8, 1, 1.8],             { ease: focusEase });
  const filter   = useMotionTemplate`blur(${blur}px) brightness(${bright}) contrast(${contrast})`;

  if (reduce) {
    return (
      <figure ref={ref} className="relative z-10 m-0" onClick={onExpand}>
        <div className="relative w-full overflow-hidden cursor-pointer" style={{ aspectRatio, borderRadius: rounded }}>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${src}")` }} />
          {caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/80">{caption}</p>
            </div>
          )}
        </div>
      </figure>
    );
  }

  return (
    <motion.figure
      ref={ref}
      className="relative z-10 m-0 cursor-pointer"
      style={{ perspective, willChange: "transform" }}
      onClick={onExpand}
    >
      <motion.div
        className="relative w-full overflow-hidden will-change-[filter,transform]"
        style={{ aspectRatio, borderRadius: rounded, filter, x: tx, y: ty, z: tz, rotate: rot, rotateX: rx, skewX: sk }}
      >
        <motion.div
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url("${src}")`, scaleY: innerSY, backfaceVisibility: "hidden" }}
        />
        {caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/80">{caption}</p>
          </div>
        )}
        {dayNumber !== undefined && (
          <div className="absolute left-2 top-2">
            <span className="border border-[#C8A96E]/70 bg-black/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-[#C8A96E]">
              Day {dayNumber}
            </span>
          </div>
        )}
      </motion.div>
    </motion.figure>
  );
}

export type ProofTileItem = {
  src: string;
  caption?: string;
  dayNumber?: number;
  ownerName?: string;
  onExpand?: () => void;
};

export type ScrollTiltedGridProps = {
  items: ProofTileItem[];
  aspectRatio?: string;
  perspective?: number;
  maxTilt?: number;
  maxBlur?: number;
  rounded?: string;
  gap?: number;
  className?: string;
};

export function ScrollTiltedGrid({
  items,
  aspectRatio = "3/4",
  perspective = 900,
  maxTilt = 70,
  maxBlur = 8,
  rounded = "0",
  gap = 12,
  className,
}: ScrollTiltedGridProps) {
  const config = useMemo<TileConfig>(
    () => ({ aspectRatio, perspective, maxTilt, maxBlur, rounded }),
    [aspectRatio, perspective, maxTilt, maxBlur, rounded]
  );

  if (items.length === 0) return null;

  return (
    <section className={["relative w-full", className].filter(Boolean).join(" ")}>
      <div
        className="mx-auto grid w-full grid-cols-2 px-4 py-8"
        style={{ gap }}
      >
        {items.map((item, i) => (
          <Tile
            key={`${i}-${item.src}`}
            src={item.src}
            side={i % 2 === 0 ? "L" : "R"}
            config={config}
            caption={item.caption || item.ownerName}
            dayNumber={item.dayNumber}
            onExpand={item.onExpand}
          />
        ))}
      </div>
    </section>
  );
}
