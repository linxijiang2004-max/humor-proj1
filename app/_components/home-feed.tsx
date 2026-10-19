"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TIMEFRAMES, type CaptionCardData, type FeedView, type Page, type Timeframe } from "@/lib/feed";
import CaptionCard from "./caption-card";
import CreateCard from "./create-card";
import FeedShortcuts from "./feed-shortcuts";
import ListFooter from "./list-footer";
import Masonry from "./masonry";
import { usePages } from "./use-pages";

type Props = {
  view: FeedView;
  timeframe: Timeframe;
  initial: Page<CaptionCardData>;
  fetchPage: (cursor: number) => Promise<Page<CaptionCardData>>;
  signedIn: boolean;
};

// Lets the last vote's feedback play before the feed gives way to the end.
const END_DELAY_MS = 600;

export default function HomeFeed({ view, timeframe, initial, fetchPage, signedIn }: Props) {
  const { items, batchStart, update, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  // Every card in the Unrated feed arrived unvoted, so the count left is the
  // total minus the ones voted on since. That is also this session's count.
  const voted = items.filter((card) => card.myVote !== 0).length;
  const remaining = view === "unrated" ? Math.max(0, (initial.total ?? items.length) - voted) : null;
  const caughtUp = remaining === 0 && !hasMore && !error;

  const [endReached, setEndReached] = useState(caughtUp);
  useEffect(() => {
    if (!caughtUp) return;
    const timer = setTimeout(() => setEndReached(true), END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [caughtUp]);

  if (caughtUp && endReached) {
    return (
      <>
        <FeedToolbar view={view} timeframe={timeframe} signedIn={signedIn} remaining={remaining} />
        <CaughtUp voted={voted} />
      </>
    );
  }

  return (
    <>
      <FeedToolbar view={view} timeframe={timeframe} signedIn={signedIn} remaining={remaining} />
      <FeedShortcuts />

      {items.length > 0 && (
        <Masonry batchStart={batchStart}>
          {withCreateCard(
            items.map((card, i) => (
              <CaptionCard
                key={card.id}
                card={card}
                index={i}
                signedIn={signedIn}
                onChange={(patch) => update(card.id, patch)}
              />
            )),
          )}
        </Masonry>
      )}

      {items.length === 0 && !hasMore ? (
        <p className="py-16 text-center text-muted">{error ?? "nothing here yet"}</p>
      ) : (
        <ListFooter
          sentinelRef={sentinelRef}
          hasMore={hasMore}
          loading={loading}
          error={error}
          onLoadMore={loadMore}
        />
      )}

      {/* Floats over the feed, bottom centre, so making one is always in
          reach while scrolling. The spacer keeps it off the last cards. */}
      <div aria-hidden="true" className="h-16" />
      <Link
        href="/new"
        className="fixed bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-page transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + add yours
      </Link>
    </>
  );
}

// After the 6th card (or last, in a shorter feed), dealt into the columns
// like any card.
function withCreateCard(cards: React.ReactNode[]) {
  const at = Math.min(6, cards.length);
  return [...cards.slice(0, at), <CreateCard key="create" />, ...cards.slice(at)];
}

// One slim row: view tabs and timeframe side by side, both the same
// segmented control, then the count. Signed out, the line after the
// timeframe is the only onboarding there is.
function FeedToolbar({
  view,
  timeframe,
  signedIn,
  remaining,
}: {
  view: FeedView;
  timeframe: Timeframe;
  signedIn: boolean;
  remaining: number | null;
}) {
  return (
    <div className="mb-4 flex min-h-8 flex-wrap items-center gap-x-2 gap-y-2 text-sm sm:gap-x-3">
      {signedIn && (
        <Segmented
          label="feed"
          options={[
            { key: "unrated", label: "unrated", href: `/?view=unrated&t=${timeframe}` },
            { key: "top", label: "top", href: `/?view=top&t=${timeframe}` },
          ]}
          active={view}
        />
      )}

      <Segmented
        label="timeframe"
        options={TIMEFRAMES.map(({ key, label }) => ({ key, label, href: `/?view=${view}&t=${key}` }))}
        active={timeframe}
      />

      {!signedIn && <p className="text-[14px] text-muted">vote to see the scores</p>}

      {remaining !== null && (
        <span aria-live="polite" className="tabular-nums text-muted">
          {remaining} left
        </span>
      )}
    </div>
  );
}

// A row of links that reads as one control; the current one is filled.
// Switching keeps the scroll position.
function Segmented({
  label,
  options,
  active,
}: {
  label: string;
  options: { key: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <nav aria-label={label} className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-800">
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          scroll={false}
          aria-current={option.key === active ? "page" : undefined}
          className={
            option.key === active
              ? "rounded px-2 py-1 font-medium text-gray-900 bg-gray-200 sm:px-2.5 dark:bg-gray-800 dark:text-gray-100"
              : "rounded px-2 py-1 text-gray-500 hover:text-gray-900 sm:px-2.5 dark:hover:text-gray-100"
          }
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

// The end of a session: the one screen allowed to be a dead end, so that
// coming back later means there's something new.
function CaughtUp({ voted }: { voted: number }) {
  return (
    <section aria-live="polite" className="mx-auto flex max-w-md flex-col items-center gap-2 py-24 text-center">
      <h2 className="text-[22px] font-bold">you&apos;re caught up</h2>
      <p className="text-[15px] text-muted">
        {voted === 0 ? "nothing new to vote on" : `${voted} ${voted === 1 ? "vote" : "votes"} this session`}
      </p>
      <Link
        href="/new"
        className="mt-2 text-[15px] font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        add yours
      </Link>
    </section>
  );
}
