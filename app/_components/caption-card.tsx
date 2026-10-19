"use client";

import type { CaptionCardData } from "@/lib/feed";
import FavoriteButton from "./favorite-button";
import VoteControl from "./vote-control";

// Caption first, image second: the caption is the joke, the image amplifies it.
// No author, timestamp or share button on purpose.
//
// Layout lives in .caption-card (globals.css): actions at the bottom on
// phones, beside the caption on wider screens. `index` is the card's place
// in reading order, for the J/K shortcuts.
export default function CaptionCard({
  card,
  index,
  signedIn,
  onChange,
}: {
  card: CaptionCardData;
  index: number;
  signedIn: boolean;
  onChange: (patch: Partial<CaptionCardData>) => void;
}) {
  const hasImage = Boolean(card.imageUrl);

  return (
    <article
      data-card={index}
      data-no-image={hasImage ? undefined : ""}
      tabIndex={-1}
      className="caption-card rounded-[14px] bg-card p-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <p className="[grid-area:caption] text-[19px] font-semibold leading-[1.32] tracking-[-0.012em] text-ink">
        {card.content}
      </p>

      <div className="[grid-area:votes] mt-1 sm:mt-0">
        <VoteControl
          captionId={card.id}
          vote={card.myVote}
          score={card.score}
          mine={card.mine}
          signedIn={signedIn}
          onChange={onChange}
        />
      </div>

      {card.imageUrl && (
        // Natural aspect ratio, so nothing is cropped: many GIFs have their
        // text burned in along the edges. Only images taller than 9:16 (a
        // phone screen) are capped, at 178% of the width via the container
        // query unit, so one extreme image can't take over the column.
        <div className="@container [grid-area:image] mt-[14px] overflow-hidden rounded-[10px]">
          {/* Image URLs can come from any host, and GIFs must stay animated,
              so a plain <img> is used instead of next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt=""
            loading="lazy"
            className="block h-auto max-h-[178cqw] w-full object-cover transition-transform duration-[250ms] ease-out pointer-fine:hover:scale-[1.02] motion-reduce:transition-none"
          />
        </div>
      )}

      {/* Phones: end of the bottom row. Wider: on the image's corner, or its
          own row when there's no image. Negative margins let the tap target
          overhang the padding so the icon lines up with it. */}
      <div
        className={
          hasImage
            ? "relative z-[1] [grid-area:heart] mt-1 -mr-[9px] -mb-[9px] self-center justify-self-end pointer-coarse:-mr-[13px] pointer-coarse:-mb-[13px] sm:m-3 sm:[grid-area:image] sm:self-end sm:pointer-coarse:m-3"
            : "[grid-area:heart] mt-1 -mr-[9px] -mb-[9px] self-center justify-self-end pointer-coarse:-mr-[13px] pointer-coarse:-mb-[13px] sm:mt-[5px]"
        }
      >
        <FavoriteButton
          captionId={card.id}
          favorited={card.favorited}
          signedIn={signedIn}
          onChange={(favorited) => onChange({ favorited })}
          overlay={hasImage}
        />
      </div>
    </article>
  );
}
