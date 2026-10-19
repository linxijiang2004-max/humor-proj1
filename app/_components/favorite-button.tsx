"use client";

import { useCallback, useRef, useState } from "react";
import { setFavorite } from "@/lib/caption-actions";
import { HeartIcon } from "./icons";
import { iconButtonClass } from "./vote-control";
import Popover from "./popover";

type Props = {
  captionId: number;
  favorited: boolean;
  signedIn: boolean;
  onChange: (favorited: boolean) => void;
  // From 640px up it sits on top of the image and needs its own backdrop to
  // stay legible on both light and dark images. On phones it's a plain icon
  // in the card's bottom row.
  overlay?: boolean;
};

// 32px frosted circle. Tinting only the circle (not a scrim over the whole
// image) keeps the image, which is the content, undimmed.
const overlayClass = (favorited: boolean) =>
  [
    iconButtonClass(favorited),
    "sm:h-8 sm:w-8 sm:bg-black/35 sm:backdrop-blur-[8px] sm:hover:bg-black/55 sm:focus-visible:outline-offset-2",
    "sm:pointer-coarse:h-11 sm:pointer-coarse:w-11",
    favorited ? "" : "sm:text-white/90 sm:hover:text-white",
  ].join(" ");

export default function FavoriteButton({ captionId, favorited, signedIn, onChange, overlay }: Props) {
  const [message, setMessage] = useState<{ text: string; signIn?: boolean } | null>(null);
  // Pops once when a click fills the heart.
  const [popped, setPopped] = useState(false);
  const busy = useRef(false);
  const closeMessage = useCallback(() => setMessage(null), []);

  async function toggle() {
    if (!signedIn) {
      setMessage({ text: "sign in to save", signIn: true });
      return;
    }
    if (busy.current) return;
    busy.current = true;

    const next = !favorited;
    setPopped(next);
    onChange(next);
    const result = await setFavorite(captionId, next);
    busy.current = false;
    if (result.error) {
      onChange(!next);
      setMessage({ text: result.error });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={favorited ? "unsave" : "save"}
        aria-pressed={signedIn ? favorited : undefined}
        data-shortcut="favorite"
        onClick={toggle}
        onAnimationEnd={() => setPopped(false)}
        className={overlay ? overlayClass(favorited) : iconButtonClass(favorited)}
      >
        <HeartIcon
          filled={favorited}
          className={`h-[18px] w-[18px] ${overlay ? "sm:h-[17px] sm:w-[17px]" : ""} ${popped ? "motion-safe:animate-pop-heart" : ""}`}
        />
      </button>
      {message && (
        <Popover message={message.text} signIn={message.signIn} above={overlay} onClose={closeMessage} />
      )}
    </div>
  );
}
