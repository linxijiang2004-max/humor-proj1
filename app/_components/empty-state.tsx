import Link from "next/link";

// One line of muted text and one accent link: what's missing, and the verb
// that fixes it.
export default function EmptyState({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <p className="flex flex-col items-center gap-2 text-[15px]">
      <span className="text-muted">{text}</span>
      <Link
        href={href}
        className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {action}
      </Link>
    </p>
  );
}
