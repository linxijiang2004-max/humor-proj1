import type { Metadata } from "next";
import Link from "next/link";
import { loadFeedPage } from "@/lib/caption-actions";
import { TIMEFRAMES, parseTimeframe } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import CaptionFeed from "./_components/caption-feed";

export const metadata: Metadata = {
  title: "Top 100 — Linxi Jiang",
};

// The feed: public captions ranked by score within a timeframe.
export default async function Home({ searchParams }: PageProps<"/">) {
  const timeframe = parseTimeframe((await searchParams).t);

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    initial,
  ] = await Promise.all([supabase.auth.getUser(), loadFeedPage(timeframe, 0)]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="sr-only">Top 100</h1>

      <nav aria-label="Timeframe" className="mb-6 flex gap-1 overflow-x-auto text-sm">
        {TIMEFRAMES.map(({ key, label }) => {
          const active = key === timeframe;
          return (
            <Link
              key={key}
              href={`/?t=${key}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "whitespace-nowrap rounded-md bg-gray-200 px-3 py-1.5 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  : "whitespace-nowrap rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-900 dark:hover:text-gray-100"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <CaptionFeed
        // A new timeframe starts a fresh list instead of appending to the old one.
        key={timeframe}
        initial={initial}
        fetchPage={loadFeedPage.bind(null, timeframe)}
        signedIn={Boolean(user)}
        emptyMessage="No captions in this timeframe yet."
      />
    </main>
  );
}
