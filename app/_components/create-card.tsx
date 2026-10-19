import Link from "next/link";

// Sits in the feed grid like a caption card: same surface, radius and
// padding, separated from the page by surface value only, never an outline.
// It reads as an invitation through the accent alone. The whole card is the
// link; the focus ring is the only outline it ever shows.
export default function CreateCard() {
  return (
    <Link
      href="/new"
      className="flex min-h-[220px] flex-col items-center justify-center gap-1.5 rounded-[14px] bg-card p-[18px] text-accent transition-[background-color,scale] duration-[160ms] ease-out hover:scale-[1.01] hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <span aria-hidden="true" className="text-[22px] leading-none font-semibold">
        +
      </span>
      <span className="text-[15px] font-semibold">add yours</span>
    </Link>
  );
}
