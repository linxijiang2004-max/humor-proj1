"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/lib/feed";

// Paginated list state: appends the next page when the sentinel element
// scrolls into view (or when `loadMore` is called from a button).
export function usePages<T extends { id: number }>(
  initial: Page<T>,
  fetchPage: (offset: number) => Promise<Page<T>>,
) {
  // batchStart: index of the first item of the latest page, for its
  // arrival animation.
  const [{ items, batchStart }, setList] = useState({ items: initial.items, batchStart: 0 });
  const [cursor, setCursor] = useState(initial.cursor);
  const [error, setError] = useState(initial.error ?? null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || cursor === null) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(cursor);
      // Scores can change between pages, so a caption may show up twice.
      setList((current) => {
        const seen = new Set(current.items.map((item) => item.id));
        return {
          items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))],
          batchStart: current.items.length,
        };
      });
      setCursor(page.cursor);
      if (page.error) setError(page.error);
    } catch {
      setError("couldn't load, try again");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchPage, cursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || cursor === null || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, cursor, error]);

  const update = useCallback((id: number, patch: Partial<T>) => {
    setList((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }, []);

  return { items, batchStart, update, hasMore: cursor !== null, error, loading, loadMore, sentinelRef };
}
