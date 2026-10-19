"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setVote } from "@/lib/caption-actions";
import type { Vote } from "@/lib/feed";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import Popover from "./popover";

const scoreFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

// 36px tap target around an 18px icon, 44px on touch screens: the hit area
// grows, the glyph doesn't. Default muted, hover brightens, active is the
// accent (filled by the icon itself).
export function iconButtonClass(active: boolean) {
  return [
    "flex h-9 w-9 items-center justify-center rounded-full transition-colors pointer-coarse:h-11 pointer-coarse:w-11",
    "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent",
    active ? "text-accent" : "text-muted hover:bg-white/5 hover:text-ink",
  ].join(" ");
}

type Props = {
  captionId: number;
  vote: Vote;
  score: number;
  // The viewer wrote this caption: its score is always shown.
  mine: boolean;
  signedIn: boolean;
  onChange: (next: { myVote: Vote; score: number }) => void;
};

// Vertical up / score / down. State lives in the parent list so it survives
// cards moving between masonry columns.
//
// Score visibility: shown only once the current user has voted on this
// caption, signed out included (they can't vote, so they never see one).
// Revealing it is the reward for voting. The one exception is the viewer's
// own captions, whose score is how they see their work landing.
export default function VoteControl({ captionId, vote, score, mine, signedIn, onChange }: Props) {
  const [message, setMessage] = useState<{ text: string; signIn?: boolean } | null>(null);
  // The arrow just filled by a click, springs once.
  const [popped, setPopped] = useState<Vote>(0);
  const busy = useRef(false);
  const closeMessage = useCallback(() => setMessage(null), []);

  const scoreVisible = mine || vote !== 0;
  const shownScore = useTicker(score);

  async function cast(direction: 1 | -1) {
    if (!signedIn) {
      setMessage({ text: "sign in to vote", signIn: true });
      return;
    }
    if (busy.current) return;
    busy.current = true;

    const previous = { myVote: vote, score };
    // Same direction again removes the vote; the other direction flips it.
    const next: Vote = vote === direction ? 0 : direction;
    setPopped(next);

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
    // Phones: a row along the card's bottom edge. Wider: a column beside the
    // caption. Negative margins align the icons, not their tap targets, with
    // the card's padding.
    <div
      className={[
        "relative flex shrink-0 flex-row items-center sm:flex-col",
        "-ml-[9px] -mb-[9px] pointer-coarse:-ml-[13px] pointer-coarse:-mb-[13px]",
        "sm:m-0 sm:-mt-[9px] sm:-mr-[9px] sm:pointer-coarse:m-0 sm:pointer-coarse:-mt-[13px] sm:pointer-coarse:-mr-[13px]",
      ].join(" ")}
    >
      <button
        type="button"
        aria-label="upvote"
        aria-pressed={signedIn ? vote === 1 : undefined}
        data-shortcut="up"
        onClick={() => cast(1)}
        onAnimationEnd={() => setPopped(0)}
        className={iconButtonClass(vote === 1)}
      >
        <ArrowUpIcon
          filled={vote === 1}
          className={`h-[18px] w-[18px] ${popped === 1 ? "motion-safe:animate-pop" : ""}`}
        />
      </button>

      {/* No number, no gap: the slot collapses to nothing (width in the
          phone row, height in the column) and opens when the user votes.
          Removed from the accessibility tree while closed. */}
      <div
        aria-hidden={!scoreVisible}
        className={`grid transition-[grid-template-columns,grid-template-rows,opacity] duration-[180ms] ease-out motion-reduce:transition-none ${
          scoreVisible
            ? "grid-cols-[1fr] grid-rows-[1fr] opacity-100"
            : "grid-cols-[0fr] grid-rows-[1fr] opacity-0 sm:grid-cols-[1fr] sm:grid-rows-[0fr]"
        }`}
      >
        <span className="min-h-0 min-w-0 select-none overflow-hidden whitespace-nowrap px-0.5 text-center text-[15px] font-bold leading-5 tabular-nums text-ink sm:min-w-9 sm:px-0">
          <span className="sr-only">score </span>
          {scoreFormat.format(shownScore)}
        </span>
      </div>

      <button
        type="button"
        aria-label="downvote"
        aria-pressed={signedIn ? vote === -1 : undefined}
        data-shortcut="down"
        onClick={() => cast(-1)}
        onAnimationEnd={() => setPopped(0)}
        className={iconButtonClass(vote === -1)}
      >
        <ArrowDownIcon
          filled={vote === -1}
          className={`h-[18px] w-[18px] ${popped === -1 ? "motion-safe:animate-pop" : ""}`}
        />
      </button>

      {message && (
        <Popover
          message={message.text}
          signIn={message.signIn}
          align="left-0 sm:left-auto sm:right-0"
          onClose={closeMessage}
        />
      )}
    </div>
  );
}

const STEP_MS = 70;
// Bigger jumps (someone else's votes landing) roll instead of ticking.
const MAX_TICKS = 6;

// The number moves by one at a time to its new value rather than swapping,
// so a vote reads as +1 / -1. While hidden it still tracks the score, so the
// first vote reveals the old number and ticks from there.
function useTicker(target: number) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const distance = Math.abs(target - from);
    const steps = reduce ? 1 : Math.min(distance, MAX_TICKS);
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      current.current = step === steps ? target : Math.round(from + ((target - from) * step) / steps);
      setShown(current.current);
      if (step === steps) clearInterval(timer);
    }, reduce ? 0 : STEP_MS);
    return () => clearInterval(timer);
  }, [target]);

  return shown;
}
