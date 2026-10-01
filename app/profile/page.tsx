import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const metadata: Metadata = {
  title: "Profile — Linxi Jiang",
};

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();
  // proxy.ts already redirects signed-out visitors; this is a second check.
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Profile</h1>

      <div className="mb-8 flex items-center gap-4">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Your profile photo"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl text-gray-500 dark:bg-gray-800">
            {(profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "No name yet"}
          </p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <ProfileForm profile={profile} />
    </main>
  );
}
