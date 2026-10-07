"use client";

import type { ImageCardData, Page } from "@/lib/feed";
import ListFooter from "./list-footer";
import Masonry from "./masonry";
import { usePages } from "./use-pages";

export default function ImageFeed({
  initial,
  fetchPage,
}: {
  initial: Page<ImageCardData>;
  fetchPage: (offset: number) => Promise<Page<ImageCardData>>;
}) {
  const { items, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  if (items.length === 0 && !hasMore) {
    return <p className="py-16 text-center text-gray-500">{error ?? "No images yet."}</p>;
  }

  return (
    <>
      <Masonry>
        {items.map((image) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.id}
            src={image.url}
            alt=""
            loading="lazy"
            className="block w-full rounded-lg border border-gray-200 dark:border-gray-800"
          />
        ))}
      </Masonry>
      <ListFooter
        sentinelRef={sentinelRef}
        hasMore={hasMore}
        loading={loading}
        error={error}
        onLoadMore={loadMore}
      />
    </>
  );
}
