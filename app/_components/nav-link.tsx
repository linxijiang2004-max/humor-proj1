"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "whitespace-nowrap rounded-md px-2 py-1.5 font-medium text-gray-900 dark:text-gray-100"
          : "whitespace-nowrap rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-900 dark:hover:text-gray-100"
      }
    >
      {children}
    </Link>
  );
}
