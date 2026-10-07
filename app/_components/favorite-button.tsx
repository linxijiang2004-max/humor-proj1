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
};

export default function FavoriteButton({ captionId, favorited, signedIn, onChange }: Props) {
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
        className={iconButtonClass(favorited)}
      >
        <HeartIcon filled={favorited} className="h-5 w-5" />
      </button>
      {message && <Popover message={message.text} signIn={message.signIn} onClose={closeMessage} />}
    </div>
  );
}
