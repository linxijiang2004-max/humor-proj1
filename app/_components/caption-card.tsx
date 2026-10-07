"use client";

import type { CaptionCardData } from "@/lib/feed";
import FavoriteButton from "./favorite-button";
import VoteControl from "./vote-control";

// Caption first, image second: the caption is the joke, the image amplifies it.
// No author, timestamp or share button on purpose.
export default function CaptionCard({
  card,
  signedIn,
  onChange,
}: {
  card: CaptionCardData;
  signedIn: boolean;
  onChange: (patch: Partial<CaptionCardData>) => void;
}) {
  return (
    <article className="rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-start gap-3 p-4 pr-2">
        <p className="flex-1 pt-1 text-base">{card.content}</p>
        <VoteControl
          captionId={card.id}
          vote={card.myVote}
          score={card.score}
          signedIn={signedIn}
          onChange={onChange}
        />
      </div>

      {card.imageUrl && (
        // Image URLs can come from any host, and GIFs must stay animated, so a
        // plain <img> is used instead of next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt="" loading="lazy" className="block w-full" />
      )}

      <div className="flex justify-end px-2 py-1.5">
        <FavoriteButton
          captionId={card.id}
          favorited={card.favorited}
          signedIn={signedIn}
          onChange={(favorited) => onChange({ favorited })}
        />
      </div>
    </article>
  );
}
