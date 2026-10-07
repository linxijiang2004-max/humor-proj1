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
    <article className="rounded-[14px] bg-card p-[18px]">
      <div className="flex items-start gap-3">
        <p className="flex-1 text-[19px] font-semibold leading-[1.32] tracking-[-0.012em] text-ink">
          {card.content}
        </p>
        <VoteControl
          captionId={card.id}
          vote={card.myVote}
          score={card.score}
          signedIn={signedIn}
          onChange={onChange}
        />
      </div>

      {card.imageUrl ? (
        // Natural aspect ratio, so nothing is cropped: many GIFs have their
        // text burned in along the edges. Only images taller than 9:16 (a
        // phone screen) are capped, at 178% of the width via the container
        // query unit, so one extreme image can't take over the column.
        // The image ends the card.
        <div className="@container relative mt-[14px]">
          <div className="overflow-hidden rounded-[10px]">
            {/* Image URLs can come from any host, and GIFs must stay animated,
                so a plain <img> is used instead of next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.imageUrl} alt="" loading="lazy" className="block h-auto max-h-[178cqw] w-full object-cover" />
          </div>
          {/* Outside the clipping wrapper so its popover isn't cut off. */}
          <div className="absolute right-3 bottom-3">
            <FavoriteButton
              captionId={card.id}
              favorited={card.favorited}
              signedIn={signedIn}
              onChange={(favorited) => onChange({ favorited })}
              overlay
            />
          </div>
        </div>
      ) : (
        // No image to sit on: the heart gets its own row. Negative margins let
        // the 36px tap target overhang the padding.
        <div className="mt-[5px] -mr-[9px] -mb-[9px] flex justify-end">
          <FavoriteButton
            captionId={card.id}
            favorited={card.favorited}
            signedIn={signedIn}
            onChange={(favorited) => onChange({ favorited })}
          />
        </div>
      )}
    </article>
  );
}
