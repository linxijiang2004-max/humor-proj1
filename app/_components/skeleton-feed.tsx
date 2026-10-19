"use client";

import Masonry from "./masonry";

// Varied image shapes so the placeholder grid has the feed's rhythm, not a
// uniform wall. null is a text-only card.
const IMAGE_RATIOS = ["4 / 3", "1 / 1", null, "3 / 4", "16 / 9", "4 / 5", "1 / 1", null, "4 / 3"];

// A caption card with nothing in it yet, at the real card's dimensions:
// 25px caption lines (19px type at 1.32), the image 14px below, and on
// phones the action row along the bottom (on wider screens the actions sit
// beside the caption or on the image, so the row only exists without one).
function SkeletonCard({ ratio, lines }: { ratio: string | null; lines: number }) {
  const bar = "rounded-[6px] bg-white/[0.06] motion-safe:animate-pulse";
  return (
    <div aria-hidden="true" className="rounded-[14px] bg-card p-[18px]">
      <div className="sm:pr-12">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex h-[25px] items-center">
            <div className={`h-[17px] ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"} ${bar}`} />
          </div>
        ))}
      </div>
      {ratio && <div className={`mt-[14px] rounded-[10px] ${bar}`} style={{ aspectRatio: ratio }} />}
      <div className={`-mb-[9px] h-9 pointer-coarse:-mb-[13px] pointer-coarse:h-11 ${ratio ? "mt-1 sm:hidden" : "mt-1 sm:mt-[5px]"}`} />
    </div>
  );
}

// `images`: bare image tiles, for the Images page.
export default function SkeletonFeed({ count = IMAGE_RATIOS.length, images }: { count?: number; images?: boolean }) {
  return (
    <div role="status">
      <span className="sr-only">loading…</span>
      <Masonry>
        {Array.from({ length: count }, (_, i) =>
          images ? (
            <div
              key={i}
              aria-hidden="true"
              className="rounded-[14px] bg-card motion-safe:animate-pulse"
              style={{ aspectRatio: IMAGE_RATIOS[i % IMAGE_RATIOS.length] ?? "1 / 1" }}
            />
          ) : (
            <SkeletonCard key={i} ratio={IMAGE_RATIOS[i % IMAGE_RATIOS.length]} lines={i % 3 === 1 ? 1 : 2} />
          ),
        )}
      </Masonry>
    </div>
  );
}
