"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/lib/feed";

// Paginated list state: appends the next page when the sentinel element
// scrolls into view (or when `loadMore` is called from a button).
export function usePages<T extends { id: number }>(
  initial: Page<T>,
  fetchPage: (offset: number) => Promise<Page<T>>,
) {
  const [items, setItems] = useState(initial.items);
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
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.cursor);
      if (page.error) setError(page.error);
    } catch {
      setError("Couldn't load more. Check your connection and try again.");
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
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  return { items, update, hasMore: cursor !== null, error, loading, loadMore, sentinelRef };
}
