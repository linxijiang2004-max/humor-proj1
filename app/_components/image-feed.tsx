"use client";

import type { ImageCardData, Page } from "@/lib/feed";
import EmptyState from "./empty-state";
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
  const { items, batchStart, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  if (items.length === 0 && !hasMore) {
    return (
      <div className="py-16 text-center text-muted">
        {error ?? <EmptyState text="no images yet" href="/new" action="add one" />}
      </div>
    );
  }

  return (
    <>
      <Masonry batchStart={batchStart}>
        {items.map((image) => (
          // The wrapper clips, so the hover zoom stays on the image.
          <div key={image.id} className="overflow-hidden rounded-[14px] bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              loading="lazy"
              className="block w-full transition-transform duration-[250ms] ease-out hover:scale-[1.02] motion-reduce:transition-none"
            />
          </div>
        ))}
      </Masonry>
      <ListFooter
        sentinelRef={sentinelRef}
        hasMore={hasMore}
        loading={loading}
        error={error}
        onLoadMore={loadMore}
        images
      />
    </>
  );
}
