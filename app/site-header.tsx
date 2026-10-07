import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";
import AvatarMenu from "./_components/avatar-menu";
import NavLink from "./_components/nav-link";

// logo | New ........ Top 100 | Favorites | Images | avatar
export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-1 px-4 py-2 text-sm">
        <Link href="/" className="mr-2 whitespace-nowrap font-bold">
          Humor Project
        </Link>
        <NavLink href="/new">New</NavLink>

        <div className="ml-auto flex items-center gap-1">
          <NavLink href="/">Top 100</NavLink>
          <NavLink href="/favorites">Favorites</NavLink>
          <NavLink href="/images">Images</NavLink>
          <div className="ml-2">
            {user ? (
              <AvatarMenu
                name={profile?.first_name || user.email || "Account"}
                email={user.email ?? null}
                avatarUrl={profile?.avatar_url ?? null}
              />
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
