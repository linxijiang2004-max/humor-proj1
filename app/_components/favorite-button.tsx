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
  // Sits on top of the image: needs its own backdrop to stay legible on
  // both light and dark images.
  overlay?: boolean;
};

// 32px frosted circle. Tinting only the circle (not a scrim over the whole
// image) keeps the image, which is the content, undimmed.
const overlayClass = (favorited: boolean) =>
  [
    "flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-[8px] transition-colors",
    "hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    favorited ? "text-accent" : "text-white/90 hover:text-white",
  ].join(" ");

export default function FavoriteButton({ captionId, favorited, signedIn, onChange, overlay }: Props) {
  const [message, setMessage] = useState<{ text: string; signIn?: boolean } | null>(null);
  const busy = useRef(false);
  const closeMessage = useCallback(() => setMessage(null), []);

  async function toggle() {
    if (!signedIn) {
      setMessage({ text: "Sign in to save favorites.", signIn: true });
      return;
    }
    if (busy.current) return;
    busy.current = true;

    const next = !favorited;
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
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={signedIn ? favorited : undefined}
        onClick={toggle}
        className={overlay ? overlayClass(favorited) : iconButtonClass(favorited)}
      >
        <HeartIcon filled={favorited} className={overlay ? "h-[17px] w-[17px]" : "h-[18px] w-[18px]"} />
      </button>
      {message && (
        <Popover message={message.text} signIn={message.signIn} above={overlay} onClose={closeMessage} />
      )}
    </div>
  );
}
