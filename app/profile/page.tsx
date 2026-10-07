import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();
  // proxy.ts already redirects signed-out visitors; this is a second check.
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Profile</h1>

      <ProfileForm profile={profile} email={user.email ?? null} />
    </main>
  );
}
