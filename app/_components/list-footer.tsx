import type { RefObject } from "react";
import SkeletonFeed from "./skeleton-feed";

// Shared bottom of a paginated list: sentinel for infinite scroll, a row of
// skeleton cards while the next page loads, a manual "Load more" fallback,
// and errors.
export default function ListFooter({
  sentinelRef,
  hasMore,
  loading,
  error,
  onLoadMore,
  images,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
  // Skeletons shaped like image tiles instead of caption cards.
  images?: boolean;
}) {
  if (loading) {
    return (
      <div ref={sentinelRef} className="mt-5 pb-8">
        <SkeletonFeed count={3} images={images} />
      </div>
    );
  }

  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-3 py-8 text-sm text-gray-500">
      {error && (
        <p role="alert" className="text-ink">
          {error}
        </p>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          load more
        </button>
      )}
    </div>
  );
}
