import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import NewCaptionFlow from "./new-caption-flow";

export const metadata: Metadata = {
  title: "new",
};

// Two sequential Gemini calls can take a while; give the server action room.
export const maxDuration = 60;

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function NewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">what did you see?</h1>
      <NewCaptionFlow />
    </main>
  );
}
