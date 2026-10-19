"use client";

import type { CaptionCardData, Page } from "@/lib/feed";
import CaptionCard from "./caption-card";
import FeedShortcuts from "./feed-shortcuts";
import ListFooter from "./list-footer";
import Masonry from "./masonry";
import { usePages } from "./use-pages";

export default function CaptionFeed({
  initial,
  fetchPage,
  signedIn,
  empty,
}: {
  initial: Page<CaptionCardData>;
  fetchPage: (offset: number) => Promise<Page<CaptionCardData>>;
  signedIn: boolean;
  // Shown when there's nothing at all.
  empty: React.ReactNode;
}) {
  const { items, batchStart, update, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  if (items.length === 0 && !hasMore) {
    return <div className="py-16 text-center text-muted">{error ?? empty}</div>;
  }

  return (
    <>
      <FeedShortcuts />
      <Masonry batchStart={batchStart}>
        {items.map((card, i) => (
          <CaptionCard
            key={card.id}
            card={card}
            index={i}
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
