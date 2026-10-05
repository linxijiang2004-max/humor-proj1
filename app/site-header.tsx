import Link from "next/link";
import { getUserAndProfile } from "@/lib/supabase/server";

// Shows different links depending on whether the visitor is signed in.
export default async function SiteHeader() {
  const { user, profile } = await getUserAndProfile();

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-bold">
          Humor Project
        </Link>
        <Link href="/captions" className="text-gray-600 hover:underline dark:text-gray-400">
          Captions
        </Link>

        <div className="ml-auto flex items-center gap-4">
          {user ? (
            <>
              <Link href="/new" className="text-gray-600 hover:underline dark:text-gray-400">
                New caption
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:underline dark:text-gray-400">
                Dashboard
              </Link>
              <Link href="/profile" className="flex items-center gap-2 hover:underline">
                {profile?.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                )}
                {profile?.first_name || user.email}
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-gray-600 hover:underline dark:text-gray-400">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
