"use client";

import { Children, useSyncExternalStore, type ReactNode } from "react";

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

// Items are dealt into columns round-robin, so rank order reads left to right
// (1, 2, 3 across the top row) and appending a page never reshuffles earlier
// items. CSS `columns` would instead fill top to bottom.
export default function Masonry({ children }: { children: ReactNode }) {
  const count = useSyncExternalStore(subscribe, getColumnCount, () => 1);
  const columns: ReactNode[][] = Array.from({ length: count }, () => []);
  Children.toArray(children).forEach((child, i) => columns[i % count].push(child));

  return (
    <div className="flex items-start gap-5">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-5">
          {column}
        </div>
      ))}
    </div>
  );
}
