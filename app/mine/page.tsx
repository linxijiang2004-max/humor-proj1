import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadMinePage } from "@/lib/caption-actions";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import CaptionFeed from "../_components/caption-feed";
import EmptyState from "../_components/empty-state";

export const metadata: Metadata = {
  title: "mine",
};

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function MinePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  const initial = await loadMinePage(0);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-3 sm:px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">mine</h1>
      <CaptionFeed
        initial={initial}
        fetchPage={loadMinePage}
        signedIn
        empty={<EmptyState text="nothing posted yet" href="/new" action="add yours" />}
      />
    </main>
  );
}
