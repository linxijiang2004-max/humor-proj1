import { loadFeedPage, loadRatingSummary, loadUnratedPage } from "@/lib/caption-actions";
import { parseTimeframe, parseView } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import HomeFeed from "./_components/home-feed";

// The feed. Signed in: Unrated (what you haven't voted on) by default, or Top.
// Signed out: Top, ranked by score. The timeframe applies to both views.
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const view = parseView(params.view, Boolean(user));
  const timeframe = parseTimeframe(params.t);
  const initial = view === "unrated" ? await loadUnratedPage(timeframe, 0) : await loadFeedPage(timeframe, 0);
  const initialSummary = view === "unrated" && initial.total === 0 ? await loadRatingSummary() : null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-4">
      <h1 className="sr-only">{view === "unrated" ? "Unrated captions" : "Top captions"}</h1>
      <HomeFeed
        // Switching view or timeframe starts a fresh list.
        key={`${view}-${timeframe}`}
        view={view}
        timeframe={timeframe}
        initial={initial}
        fetchPage={(view === "unrated" ? loadUnratedPage : loadFeedPage).bind(null, timeframe)}
        signedIn={Boolean(user)}
        initialSummary={initialSummary}
      />
    </main>
  );
}
