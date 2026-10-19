"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Small message bubble under a control. The parent must be `relative`.
// Closes on Escape or a click anywhere else.
export default function Popover({
  message,
  signIn,
  above,
  align = "right-0",
  onClose,
}: {
  message: string;
  // Horizontal anchoring classes; defaults to the control's right edge.
  align?: string;
  // Open upward, e.g. for a control at the bottom of an image.
  above?: boolean;
  // The message itself links to /login.
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
      className={`absolute ${align} z-10 w-max ${above ? "bottom-full mb-1" : "top-full mt-1"} max-w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400`}
    >
      {signIn ? (
        <Link href="/login" className="font-medium text-ink underline">
          {message}
        </Link>
      ) : (
        message
      )}
    </div>
  );
}
