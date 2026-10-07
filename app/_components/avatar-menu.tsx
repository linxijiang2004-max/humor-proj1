"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function AvatarMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close after navigating via one of the menu links.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "block w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-900";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-medium text-gray-700 hover:ring-2 hover:ring-gray-300 focus-visible:outline-2 focus-visible:outline-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:hover:ring-gray-700"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <p className="truncate font-medium">{name}</p>
            {email && <p className="truncate text-xs text-gray-500">{email}</p>}
          </div>
          <Link role="menuitem" href="/profile" className={itemClass}>
            Profile
          </Link>
          <form action="/auth/signout" method="post">
            <button role="menuitem" type="submit" className={itemClass}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
