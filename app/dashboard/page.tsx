import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Linxi Jiang",
};

// Members-only route: proxy.ts sends signed-out visitors to /login.
export default async function DashboardPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (!hasFullName(profile)) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Hi, {profile!.first_name}!</h1>
      <p className="mb-8 text-gray-500">
        This page is only visible to signed-in users.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/new"
          className="rounded-lg border border-gray-200 p-5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <p className="font-medium">New caption →</p>
          <p className="text-sm text-gray-500">Upload an image and get AI caption ideas.</p>
        </Link>
        <Link
          href="/captions"
          className="rounded-lg border border-gray-200 p-5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <p className="font-medium">Captions →</p>
          <p className="text-sm text-gray-500">Browse the caption feed.</p>
        </Link>
        <Link
          href="/profile"
          className="rounded-lg border border-gray-200 p-5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
        >
          <p className="font-medium">Profile →</p>
          <p className="text-sm text-gray-500">Update your name and photo.</p>
        </Link>
      </div>
    </main>
  );
}
