import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadFavoritesPage } from "@/lib/caption-actions";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import CaptionFeed from "../_components/caption-feed";
import EmptyState from "../_components/empty-state";

export const metadata: Metadata = {
  title: "favorites",
};

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function FavoritesPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  const initial = await loadFavoritesPage(0);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">favorites</h1>
      <CaptionFeed
        initial={initial}
        fetchPage={loadFavoritesPage}
        signedIn
        empty={<EmptyState text="nothing saved yet" href="/" action="go vote" />}
      />
    </main>
  );
}
