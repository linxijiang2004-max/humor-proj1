// Types and constants shared by the feed pages (server) and the card and list
// components (client).

export const TIMEFRAMES = [
  { key: "week", label: "Past Week", days: 7 },
  { key: "month", label: "Past Month", days: 30 },
  { key: "year", label: "Past Year", days: 365 },
  { key: "all", label: "All Time", days: null },
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number]["key"];

export const DEFAULT_TIMEFRAME: Timeframe = "week";

export function parseTimeframe(value: unknown): Timeframe {
  return TIMEFRAMES.some((t) => t.key === value) ? (value as Timeframe) : DEFAULT_TIMEFRAME;
}

export const PAGE_SIZE = 20;
// The homepage is the "Top 100": pagination stops here.
export const FEED_MAX = 100;

export type Vote = -1 | 0 | 1;

export type CaptionCardData = {
  id: number;
  content: string;
  imageUrl: string | null;
  // Always sent so a first vote can reveal it instantly. Whether it is shown
  // is decided in VoteControl: signed-in viewers only see it after voting.
  score: number;
  myVote: Vote;
  favorited: boolean;
};

export type ImageCardData = { id: number; url: string };

export type Page<T> = {
  items: T[];
  // Offset to request next, or null when there is nothing more.
  nextOffset: number | null;
  error?: string;
};
