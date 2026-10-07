"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Small message bubble under a control. The parent must be `relative`.
// Closes on Escape or a click anywhere else.
export default function Popover({
  message,
  signIn,
  onClose,
}: {
  message: string;
  // Adds a "Sign in" link after the message.
  signIn?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="status"
      className="absolute right-0 top-full z-10 mt-1 w-max max-w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
    >
      {message}
      {signIn && (
        <>
          {" "}
          <Link href="/login" className="font-medium text-gray-900 underline dark:text-gray-100">
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
