"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/supabase/server";
import { completeOnboarding } from "../profile/actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700";

export default function OnboardingForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">first name</span>
        <input
          name="first_name"
          required
          defaultValue={profile?.first_name ?? ""}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">last name</span>
        <input
          name="last_name"
          required
          defaultValue={profile?.last_name ?? ""}
          className={inputClass}
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-page transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "saving…" : "continue"}
      </button>
    </form>
  );
}
