import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import NewCaptionFlow from "./new-caption-flow";

export const metadata: Metadata = {
  title: "New caption — Linxi Jiang",
};

// Two sequential Gemini calls can take a while; give the server action room.
export const maxDuration = 60;

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function NewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">New caption</h1>
      <p className="mb-8 text-gray-500">
        Upload an image and Gemini will suggest four captions. Nothing is published yet.
      </p>
      <NewCaptionFlow />
    </main>
  );
}
