import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = {
  title: "your name",
};

export default async function OnboardingPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (hasFullName(profile)) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm px-3 sm:px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">what&apos;s your name?</h1>
      <OnboardingForm profile={profile} />
    </main>
  );
}
