"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Keyboard shortcuts for a caption feed, on devices with a fine pointer:
//   ↑ / ↓  vote on the focused card     J / K  next / previous card
//   F      favorite the focused card     N      make one
// Deliberately undocumented in the UI: no legend, no help overlay. They're
// a reward for the people who try them.
//
// Cards are found through the DOM (data-card holds the reading-order
// index) and act by clicking their own buttons, so the shortcuts go through
// exactly the same code, feedback and sign-in prompts as a click.
export default function FeedShortcuts() {
  const router = useRouter();

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function cards() {
      return [...document.querySelectorAll<HTMLElement>("[data-card]")].sort(
        (a, b) => Number(a.dataset.card) - Number(b.dataset.card),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-card]") ?? null;
      const press = (name: string) =>
        focused?.querySelector<HTMLButtonElement>(`[data-shortcut="${name}"]`)?.click();

      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
          // Without a focused card the arrows keep scrolling the page.
          if (!focused) return;
          event.preventDefault();
          press(event.key === "ArrowUp" ? "up" : "down");
          break;
        case "j":
        case "k": {
          event.preventDefault();
          const list = cards();
          if (list.length === 0) return;
          const at = focused ? list.indexOf(focused) : -1;
          const next =
            at === -1 ? list[0] : list[Math.min(list.length - 1, Math.max(0, at + (event.key === "j" ? 1 : -1)))];
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          // Focus from a key press gets the :focus-visible ring.
          next.focus({ preventScroll: true });
          next.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
          break;
        }
        case "f":
          if (!focused) return;
          event.preventDefault();
          press("favorite");
          break;
        case "n":
          event.preventDefault();
          router.push("/new");
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
