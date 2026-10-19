"use client";

import { Children, isValidElement, useSyncExternalStore, type ReactNode } from "react";

// Widest first. Below the last query the grid is a single column.
const BREAKPOINTS = [
  ["(min-width: 1024px)", 3],
  ["(min-width: 640px)", 2],
] as const;

function subscribe(onChange: () => void) {
  const lists = BREAKPOINTS.map(([query]) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

function getColumnCount() {
  return BREAKPOINTS.find(([query]) => window.matchMedia(query).matches)?.[1] ?? 1;
}

const STAGGER_MS = 40;
// Only the first few are staggered; the rest arrive with the last of them.
const STAGGER_MAX = 6;

// Items are dealt into columns round-robin, so rank order reads left to right
// (1, 2, 3 across the top row) and appending a page never reshuffles earlier
// items. CSS `columns` would instead fill top to bottom.
//
// With `batchStart`, items fade up into place as they arrive, staggered in
// reading order from the first item of the latest page.
export default function Masonry({ children, batchStart }: { children: ReactNode; batchStart?: number }) {
  const count = useSyncExternalStore(subscribe, getColumnCount, () => 1);
  const columns: ReactNode[][] = Array.from({ length: count }, () => []);
  Children.toArray(children).forEach((child, i) => {
    if (batchStart !== undefined && isValidElement(child)) {
      const delay = Math.min(Math.max(0, i - batchStart), STAGGER_MAX - 1) * STAGGER_MS;
      child = (
        <div key={child.key} className="motion-safe:animate-card-in" style={{ animationDelay: `${delay}ms` }}>
          {child}
        </div>
      );
    }
    columns[i % count].push(child);
  });

  return (
    // Phones (one column): 14px between cards. Wider: 20px.
    <div className="flex items-start gap-[14px] sm:gap-5">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-[14px] sm:gap-5">
          {column}
        </div>
      ))}
    </div>
  );
}
