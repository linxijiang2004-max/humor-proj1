import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import AvatarMenu from "./_components/avatar-menu";
import { BitMark } from "./_components/bit-mark";
import NavLink from "./_components/nav-link";

// logo | New ........ Mine | Favorites | avatar
// Top lives in the feed's own tabs; /images still works but isn't linked.
export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto flex w-full max-w-[1200px] min-h-16 flex-wrap items-center gap-1 px-3 sm:px-4 py-3 text-sm">
        <Link href="/" className="mr-2 flex items-center gap-[10px] whitespace-nowrap">
          <BitMark />
          <span className="font-extrabold tracking-[-0.035em]">bit</span>
        </Link>
        {/* The one primary action on the site, so the one filled button.
            Dark text: white on the accent is under 4.5:1. */}
        <Link
          href="/new"
          className="whitespace-nowrap rounded-md bg-accent px-3 py-1.5 font-semibold text-page transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          new
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <NavLink href="/mine">mine</NavLink>
          <NavLink href="/favorites">favorites</NavLink>
          <div className="ml-2">
            {user ? (
              <AvatarMenu
                name={profile?.first_name || user.email || "account"}
                email={user.email ?? null}
                avatarUrl={profile?.avatar_url ?? null}
              />
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
