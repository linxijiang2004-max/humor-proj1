import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile, hasFullName } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export const metadata: Metadata = {
  title: "Welcome — Linxi Jiang",
};

export default async function OnboardingPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");
  if (hasFullName(profile)) redirect("/dashboard");

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Welcome!</h1>
      <p className="mb-8 text-gray-500">Tell us your name to finish setting up your account.</p>
      <OnboardingForm profile={profile} />
    </main>
  );
}
