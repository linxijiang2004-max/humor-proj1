"use client";

import { useCallback, useRef, useState } from "react";
import { setVote } from "@/lib/caption-actions";
import type { Vote } from "@/lib/feed";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import Popover from "./popover";

const scoreFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

// 36px tap target around an 18px icon. Default muted, hover brightens,
// active is the accent (filled by the icon itself).
export function iconButtonClass(active: boolean) {
  return [
    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent",
    active ? "text-accent" : "text-muted hover:bg-white/5 hover:text-ink",
  ].join(" ");
}

type Props = {
  captionId: number;
  vote: Vote;
  score: number;
  signedIn: boolean;
  onChange: (next: { myVote: Vote; score: number }) => void;
};

// Vertical up / score / down. State lives in the parent list so it survives
// cards moving between masonry columns.
//
// Score visibility: signed out → always shown; signed in → shown only once
// they have voted on this caption. Revealing it is the reward for voting.
export default function VoteControl({ captionId, vote, score, signedIn, onChange }: Props) {
  const [message, setMessage] = useState<{ text: string; signIn?: boolean } | null>(null);
  const busy = useRef(false);
  const closeMessage = useCallback(() => setMessage(null), []);

  const scoreVisible = !signedIn || vote !== 0;

  async function cast(direction: 1 | -1) {
    if (!signedIn) {
      setMessage({ text: "Sign in to vote.", signIn: true });
      return;
    }
    if (busy.current) return;
    busy.current = true;

    const previous = { myVote: vote, score };
    // Same direction again removes the vote; the other direction flips it.
    const next: Vote = vote === direction ? 0 : direction;

    // Optimistic: the icon state and score change (and the score fades in or
    // out) right away. The server's number then replaces the estimate.
    onChange({ myVote: next, score: score - vote + next });

    const result = await setVote(captionId, next);
    busy.current = false;
    if ("error" in result) {
      onChange(previous);
      setMessage({ text: result.error });
    } else {
      onChange({ myVote: next, score: result.score });
    }
  }

  return (
    // Negative margins align the icons, not their tap targets, with the
    // card's top-right padding.
    <div className="relative -mt-[9px] -mr-[9px] flex shrink-0 flex-col items-center">
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={signedIn ? vote === 1 : undefined}
        onClick={() => cast(1)}
        className={iconButtonClass(vote === 1)}
      >
        <ArrowUpIcon filled={vote === 1} className="h-[18px] w-[18px]" />
      </button>

      {/* Always in the layout so revealing it never moves anything; hidden
          with opacity and removed from the accessibility tree while hidden. */}
      <span
        aria-hidden={!scoreVisible}
        className={`min-w-9 select-none text-center text-[15px] font-bold leading-5 tabular-nums text-ink transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          scoreVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="sr-only">Score </span>
        {scoreFormat.format(score)}
      </span>

      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={signedIn ? vote === -1 : undefined}
        onClick={() => cast(-1)}
        className={iconButtonClass(vote === -1)}
      >
        <ArrowDownIcon filled={vote === -1} className="h-[18px] w-[18px]" />
      </button>

      {message && <Popover message={message.text} signIn={message.signIn} onClose={closeMessage} />}
    </div>
  );
}
