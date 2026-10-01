"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateAvatar } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function readName(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

// Used by /onboarding: both names are required before moving on.
export async function completeOnboarding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const firstName = readName(formData, "first_name");
  const lastName = readName(formData, "last_name");

  if (!firstName || !lastName) {
    return { error: "Please enter both your first and last name." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Used by /profile: updates names and, if a file was chosen, the photo.
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const firstName = readName(formData, "first_name");
  const lastName = readName(formData, "last_name");

  const updates: Record<string, string | null> = {
    first_name: firstName || null,
    last_name: lastName || null,
    updated_at: new Date().toISOString(),
  };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const invalid = validateAvatar(avatar);
    if (invalid) return { error: invalid };

    // The image goes to Storage; only its URL is saved in the database.
    const ext = avatar.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-buster so the browser shows the new photo at the same path.
    updates.avatar_url = `${publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}
