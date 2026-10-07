import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadFavoritesPage } from "@/lib/caption-actions";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import CaptionFeed from "../_components/caption-feed";

export const metadata: Metadata = {
  title: "Favorites",
};

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function FavoritesPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  const initial = await loadFavoritesPage(0);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">Favorites</h1>
      <CaptionFeed
        initial={initial}
        fetchPage={loadFavoritesPage}
        signedIn
        emptyMessage="Nothing saved yet. Tap the heart on a caption to keep it here."
      />
    </main>
  );
}
