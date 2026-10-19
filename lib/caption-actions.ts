"use server";

import type { User } from "@supabase/supabase-js";
import {
  FEED_MAX,
  PAGE_SIZE,
  TIMEFRAMES,
  parseTimeframe,
  type CaptionCardData,
  type ImageCardData,
  type Page,
  type Timeframe,
  type Vote,
} from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

// Every export in this file is a public endpoint (Server Action), so all
// arguments are re-validated here even though our own UI sends sane values.

type Supabase = Awaited<ReturnType<typeof createClient>>;

type CaptionRow = {
  id: number;
  content: string;
  like_count: number;
  profile_id: string | null;
  images: { url: string } | null;
};

const CAPTION_COLUMNS = "id, content, like_count, profile_id, images(url)";

async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

// ISO start of the timeframe, or null for All Time.
function timeframeStart(timeframe: unknown) {
  const { days } = TIMEFRAMES.find((t) => t.key === parseTimeframe(timeframe))!;
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
}

// Short message for the screen; the database's own wording goes to the log.
function failed(message: string, error: { message: string }) {
  console.error(message, error.message);
  return message;
}

function parseOffset(value: unknown, max = Number.MAX_SAFE_INTEGER) {
  return Number.isInteger(value) && (value as number) >= 0 ? Math.min(value as number, max) : 0;
}

// Adds the viewer's own vote and favorite to each caption, and whether they
// wrote it. The author id itself isn't sent to the client.
async function toCards(
  supabase: Supabase,
  user: User | null,
  rows: CaptionRow[],
  allFavorited = false,
): Promise<CaptionCardData[]> {
  const ids = rows.map((row) => row.id);
  const votes = new Map<number, Vote>();
  let favorites = new Set<number>();

  if (user && ids.length > 0) {
    const [voteResult, favoriteResult] = await Promise.all([
      supabase
        .from("caption_votes")
        .select("caption_id, vote_value")
        .eq("profile_id", user.id)
        .in("caption_id", ids),
      allFavorited
        ? null
        : supabase
            .from("caption_favorites")
            .select("caption_id")
            .eq("profile_id", user.id)
            .in("caption_id", ids),
    ]);

    if (voteResult.error) console.error("Couldn't load votes", voteResult.error.message);
    for (const v of voteResult.data ?? []) votes.set(v.caption_id, v.vote_value);

    // Treated as "nothing favorited" if this fails, e.g. before the
    // caption_favorites migration has been applied.
    if (favoriteResult?.error) console.error("Couldn't load favorites", favoriteResult.error.message);
    favorites = new Set((favoriteResult?.data ?? []).map((f) => f.caption_id));
  }

  return rows.map((row) => {
    const myVote = votes.get(row.id) ?? 0;
    return {
      id: row.id,
      content: row.content,
      imageUrl: row.images?.url ?? null,
      score: row.like_count,
      myVote,
      favorited: allFavorited || favorites.has(row.id),
      mine: user !== null && row.profile_id === user.id,
    };
  });
}

// Public captions ranked by score, capped at FEED_MAX.
export async function loadFeedPage(timeframe: Timeframe, offset: number): Promise<Page<CaptionCardData>> {
  const since = timeframeStart(timeframe);
  const start = parseOffset(offset, FEED_MAX);
  const limit = Math.min(PAGE_SIZE, FEED_MAX - start);
  if (limit <= 0) return { items: [], cursor: null };

  const { supabase, user } = await getViewer();

  // RLS also returns the viewer's own drafts, so is_public must be explicit.
  let query = supabase.from("captions").select(CAPTION_COLUMNS).eq("is_public", true);
  if (since) query = query.gte("created_at", since);

  // One extra row tells us whether another page exists. id breaks ties so
  // pages don't overlap when many captions share a score.
  const { data, error } = await query
    .order("like_count", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + limit)
    .overrideTypes<CaptionRow[], { merge: false }>();

  if (error) return { items: [], cursor: null, error: failed("couldn't load captions", error) };

  const hasMore = data.length > limit && start + limit < FEED_MAX;
  return {
    items: await toCards(supabase, user, data.slice(0, limit)),
    cursor: hasMore ? start + limit : null,
  };
}

// Public captions the viewer hasn't voted on, newest first. Their own
// captions are left out: rating your own caption isn't meaningful.
//
// Paged by last-seen id rather than offset: voting removes rows from this set
// while the user scrolls, which would make an offset skip captions. ids are
// identity columns, so id order is creation order.
export async function loadUnratedPage(timeframe: Timeframe, cursor: number): Promise<Page<CaptionCardData>> {
  const before = parseOffset(cursor);
  const since = timeframeStart(timeframe);
  const { supabase, user } = await getViewer();
  if (!user) return { items: [], cursor: null, error: "sign in to vote" };

  // Anti-join: embed the viewer's own vote and keep rows where it is missing.
  const unrated = (columns: string, options?: { count: "exact"; head: true }) => {
    const query = supabase
      .from("captions")
      .select(`${columns}, caption_votes!left(profile_id)`, options)
      .eq("is_public", true)
      .or(`profile_id.is.null,profile_id.neq.${user.id}`)
      .eq("caption_votes.profile_id", user.id)
      .is("caption_votes", null);
    return since ? query.gte("created_at", since) : query;
  };

  let pageQuery = unrated(CAPTION_COLUMNS).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  if (before > 0) pageQuery = pageQuery.lt("id", before);

  const [page, total] = await Promise.all([
    pageQuery.overrideTypes<CaptionRow[], { merge: false }>(),
    before === 0 ? unrated("id", { count: "exact", head: true }) : null,
  ]);

  if (page.error) return { items: [], cursor: null, error: failed("couldn't load captions", page.error) };

  const rows = page.data.slice(0, PAGE_SIZE);
  return {
    items: await toCards(supabase, user, rows),
    cursor: page.data.length > PAGE_SIZE ? rows[rows.length - 1].id : null,
    total: total?.count ?? undefined,
  };
}

// The viewer's favorites, most recently saved first.
export async function loadFavoritesPage(offset: number): Promise<Page<CaptionCardData>> {
  const start = parseOffset(offset);
  const { supabase, user } = await getViewer();
  if (!user) return { items: [], cursor: null, error: "sign in first" };

  const { data, error } = await supabase
    .from("caption_favorites")
    .select(`caption_id, captions(${CAPTION_COLUMNS}, is_public)`)
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .order("caption_id", { ascending: false })
    .range(start, start + PAGE_SIZE)
    .overrideTypes<{ caption_id: number; captions: (CaptionRow & { is_public: boolean }) | null }[], { merge: false }>();

  if (error) return { items: [], cursor: null, error: failed("couldn't load saves", error) };

  // A favorited caption that has since been unpublished is skipped.
  const rows = data
    .slice(0, PAGE_SIZE)
    .map((f) => f.captions)
    .filter((c): c is CaptionRow & { is_public: boolean } => c !== null && c.is_public);

  return {
    items: await toCards(supabase, user, rows, true),
    cursor: data.length > PAGE_SIZE ? start + PAGE_SIZE : null,
  };
}

// Captions the viewer has published, newest first. Drafts (generated but not
// picked) are left out.
export async function loadMinePage(offset: number): Promise<Page<CaptionCardData>> {
  const start = parseOffset(offset);
  const { supabase, user } = await getViewer();
  if (!user) return { items: [], cursor: null, error: "sign in first" };

  const { data, error } = await supabase
    .from("captions")
    .select(CAPTION_COLUMNS)
    .eq("profile_id", user.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + PAGE_SIZE)
    .overrideTypes<CaptionRow[], { merge: false }>();

  if (error) return { items: [], cursor: null, error: failed("couldn't load yours", error) };

  return {
    items: await toCards(supabase, user, data.slice(0, PAGE_SIZE)),
    cursor: data.length > PAGE_SIZE ? start + PAGE_SIZE : null,
  };
}

// Images that have at least one published caption, newest first.
export async function loadImagesPage(offset: number): Promise<Page<ImageCardData>> {
  const start = parseOffset(offset);
  const { supabase } = await getViewer();

  const { data, error } = await supabase
    .from("images")
    .select("id, url, captions!inner(id)")
    .eq("captions.is_public", true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + PAGE_SIZE)
    .overrideTypes<{ id: number; url: string }[], { merge: false }>();

  if (error) return { items: [], cursor: null, error: failed("couldn't load images", error) };

  return {
    items: data.slice(0, PAGE_SIZE).map(({ id, url }) => ({ id, url })),
    cursor: data.length > PAGE_SIZE ? start + PAGE_SIZE : null,
  };
}

export type VoteResult = { score: number } | { error: string };

// value 0 removes the vote. Returns the caption's new score, which also
// corrects the optimistic one if other people voted in the meantime.
export async function setVote(captionId: number, value: Vote): Promise<VoteResult> {
  if (!Number.isInteger(captionId) || ![-1, 0, 1].includes(value)) return { error: "that vote didn't work" };

  const { supabase, user } = await getViewer();
  if (!user) return { error: "sign in to vote" };

  const { data: caption } = await supabase
    .from("captions")
    .select("id")
    .eq("id", captionId)
    .eq("is_public", true)
    .maybeSingle();
  if (!caption) return { error: "that caption's gone" };

  const { error } =
    value === 0
      ? await supabase.from("caption_votes").delete().eq("profile_id", user.id).eq("caption_id", captionId)
      : await supabase
          .from("caption_votes")
          .upsert(
            { caption_id: captionId, profile_id: user.id, vote_value: value },
            { onConflict: "profile_id,caption_id" },
          );
  if (error) return { error: failed("vote didn't save", error) };

  // The trigger on caption_votes has already updated like_count.
  const { data, error: readError } = await supabase
    .from("captions")
    .select("like_count")
    .eq("id", captionId)
    .single<{ like_count: number }>();
  if (readError) return { error: failed("score didn't load", readError) };

  return { score: data.like_count };
}

export async function setFavorite(captionId: number, favorited: boolean): Promise<{ error?: string }> {
  if (!Number.isInteger(captionId) || typeof favorited !== "boolean") return { error: "that didn't work" };

  const { supabase, user } = await getViewer();
  if (!user) return { error: "sign in to save" };

  const { error } = favorited
    ? await supabase
        .from("caption_favorites")
        .upsert(
          { caption_id: captionId, profile_id: user.id },
          { onConflict: "profile_id,caption_id", ignoreDuplicates: true },
        )
    : await supabase.from("caption_favorites").delete().eq("profile_id", user.id).eq("caption_id", captionId);

  if (error) return { error: failed("didn't save, try again", error) };
  return {};
}
