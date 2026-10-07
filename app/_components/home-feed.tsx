"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadRatingSummary } from "@/lib/caption-actions";
import {
  TIMEFRAMES,
  type CaptionCardData,
  type FeedView,
  type Page,
  type RatingSummary,
  type Timeframe,
} from "@/lib/feed";
import CaptionCard from "./caption-card";
import ListFooter from "./list-footer";
import Masonry from "./masonry";
import { usePages } from "./use-pages";

type Props = {
  view: FeedView;
  timeframe: Timeframe;
  initial: Page<CaptionCardData>;
  fetchPage: (cursor: number) => Promise<Page<CaptionCardData>>;
  signedIn: boolean;
  // Preloaded when the Unrated feed is already empty on arrival.
  initialSummary: RatingSummary | null;
};

export default function HomeFeed({ view, timeframe, initial, fetchPage, signedIn, initialSummary }: Props) {
  const { items, update, hasMore, error, loading, loadMore, sentinelRef } = usePages(initial, fetchPage);

  // Every card in the Unrated feed arrived unvoted, so the count left is the
  // total minus the ones voted on since. Voted cards stay where they are.
  const voted = items.filter((card) => card.myVote !== 0).length;
  const remaining = view === "unrated" ? Math.max(0, (initial.total ?? items.length) - voted) : null;
  const caughtUp = remaining === 0 && !hasMore && !error;

  const [summary, setSummary] = useState(initialSummary);
  const [summaryFor, setSummaryFor] = useState(voted);
  // Refresh the wrap-up each time the user (re)reaches zero. Next.js sends
  // server actions one at a time per client, so this runs after the final
  // setVote has been saved and the stats include it.
  useEffect(() => {
    if (!caughtUp || summaryFor === voted) return;
    let cancelled = false;
    loadRatingSummary().then((result) => {
      if (cancelled) return;
      setSummary(result);
      setSummaryFor(voted);
    });
    return () => {
      cancelled = true;
    };
  }, [caughtUp, voted, summaryFor]);

  return (
    <>
      <FeedToolbar view={view} timeframe={timeframe} signedIn={signedIn} remaining={remaining} />

      {items.length > 0 && (
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
      )}

      {caughtUp ? (
        <WrapUp summary={summaryFor === voted ? summary : null} timeframe={timeframe} />
      ) : items.length === 0 && !hasMore ? (
        <p className="py-16 text-center text-gray-500">{error ?? "No captions in this timeframe yet."}</p>
      ) : (
        <ListFooter
          sentinelRef={sentinelRef}
          hasMore={hasMore}
          loading={loading}
          error={error}
          onLoadMore={loadMore}
        />
      )}
    </>
  );
}

// One slim row: content first, filters second.
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
  const router = useRouter();
  const tabClass = (active: boolean) =>
    active
      ? "rounded px-2.5 py-1 font-medium text-gray-900 bg-gray-200 dark:bg-gray-800 dark:text-gray-100"
      : "rounded px-2.5 py-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100";

  return (
    <div className="mb-4 flex min-h-8 items-center gap-3 text-sm">
      {signedIn && (
        <nav aria-label="Feed" className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-800">
          <Link href={`/?view=unrated&t=${timeframe}`} aria-current={view === "unrated" ? "page" : undefined} className={tabClass(view === "unrated")}>
            Unrated
          </Link>
          <Link
            href={`/?view=top&t=${timeframe}`}
            aria-current={view === "top" ? "page" : undefined}
            className={tabClass(view === "top")}
          >
            Top
          </Link>
        </nav>
      )}

      {remaining !== null && (
        <span aria-live="polite" className="tabular-nums text-gray-500">
          {remaining} left
        </span>
      )}

      <select
        aria-label="Timeframe"
        value={timeframe}
        onChange={(event) => router.push(`/?view=${view}&t=${event.target.value}`, { scroll: false })}
        className="ml-auto rounded-md border border-gray-200 bg-transparent px-2 py-1 text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:text-gray-400"
      >
        {TIMEFRAMES.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function WrapUp({ summary, timeframe }: { summary: RatingSummary | null; timeframe: Timeframe }) {
  return (
    <section aria-live="polite" className="mx-auto my-12 flex max-w-md flex-col items-center gap-3 text-center">
      <h2 className="text-lg font-semibold">You&apos;re all caught up</h2>
      {timeframe !== "all" && (
        <p className="text-sm text-gray-500">
          Nothing left to rate from the {TIMEFRAMES.find((t) => t.key === timeframe)!.label.toLowerCase()}.{" "}
          <Link href="/?view=unrated&t=all" className="text-gray-900 underline dark:text-gray-100">
            Rate older captions
          </Link>
        </p>
      )}
      {!summary ? (
        <p className="text-sm text-gray-500">Tallying your votes…</p>
      ) : summary.rated === 0 ? (
        <p className="text-sm text-gray-500">There&apos;s nothing to rate yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
          <li>
            You&apos;ve rated <strong className="text-gray-900 dark:text-gray-100">{summary.rated}</strong>{" "}
            {summary.rated === 1 ? "caption" : "captions"}.
          </li>
          {summary.bestPick && (
            <li>
              Your best pick: “{summary.bestPick.content}”{" "}
              <span className="whitespace-nowrap">({summary.bestPick.score} points)</span>
            </li>
          )}
          {summary.topSize > 0 && summary.upvotes > 0 && (
            <li>
              {summary.topMatches} of your {summary.upvotes} {summary.upvotes === 1 ? "upvote is" : "upvotes are"} in
              the crowd&apos;s top {summary.topSize}.
            </li>
          )}
        </ul>
      )}
      <Link
        href={`/?view=top&t=${timeframe}`}
        className="mt-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
      >
        See the Top →
      </Link>
    </section>
  );
}
