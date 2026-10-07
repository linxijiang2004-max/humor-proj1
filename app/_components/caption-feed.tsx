"use client";

import type { CaptionCardData, Page } from "@/lib/feed";
import CaptionCard from "./caption-card";
import ListFooter from "./list-footer";
import Masonry from "./masonry";
import { usePages } from "./use-pages";

export default function CaptionFeed({
  initial,
  fetchPage,
  signedIn,
  emptyMessage,
}: {
  initial: Page<CaptionCardData>;
  fetchPage: (offset: number) => Promise<Page<CaptionCardData>>;
  signedIn: boolean;
  emptyMessage: string;
}) {
  const { items, update, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  if (items.length === 0 && !hasMore) {
    return <p className="py-16 text-center text-gray-500">{error ?? emptyMessage}</p>;
  }

  return (
    <>
      <Masonry>
        {items.map((card) => (
          <CaptionCard
            key={card.id}
            card={card}
            signedIn={signedIn}
            onChange={(patch) => update(card.id, patch)}
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
