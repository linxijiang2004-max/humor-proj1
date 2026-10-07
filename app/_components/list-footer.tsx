import type { RefObject } from "react";

// Shared bottom of a paginated list: sentinel for infinite scroll, a manual
// "Load more" fallback, and errors.
export default function ListFooter({
  sentinelRef,
  hasMore,
  loading,
  error,
  onLoadMore,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}) {
  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-3 py-8 text-sm text-gray-500">
      {error && (
        <p role="alert" className="text-gray-700 dark:text-gray-300">
          {error}
        </p>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
