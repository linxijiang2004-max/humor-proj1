import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpIcon, HeartIcon } from "../_components/icons";

export const metadata: Metadata = {
  title: "about",
};

// What bit is, for someone who just landed from a group-chat link. Same
// voice as the rest of the app: short lowercase lines, no feature list.
// The three rows use the real controls' icons so they're recognisable
// back in the feed. Keyboard shortcuts stay unmentioned on purpose.
const STEPS = [
  {
    icon: <ArrowUpIcon filled className="h-[18px] w-[18px]" />,
    title: "vote",
    line: "the score shows after you do",
  },
  {
    icon: <span className="text-[20px] leading-none font-semibold">+</span>,
    title: "add yours",
    line: "a photo in, four captions out",
  },
  {
    icon: <HeartIcon filled className="h-[18px] w-[18px]" />,
    title: "save",
    line: "keep the ones you'd send",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-md px-3 py-12 sm:px-4 sm:py-16">
      <h1 className="text-3xl font-bold">what is bit?</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">
        photos from around campus.
        <br />
        ai writes the captions.
        <br />
        columbia votes on what&apos;s funny.
      </p>

      <ul className="mt-10 flex flex-col gap-3">
        {STEPS.map((step) => (
          <li key={step.title} className="flex items-center gap-4 rounded-[14px] bg-card p-[18px]">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center text-accent">
              {step.icon}
            </span>
            <span>
              <span className="block text-[17px] font-semibold text-ink">{step.title}</span>
              <span className="block text-[15px] text-muted">{step.line}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[15px] text-muted">made at columbia, for columbia.</p>

      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-accent px-5 py-2 text-[15px] font-semibold text-page transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        go vote
      </Link>
    </main>
  );
}
