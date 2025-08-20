import type { SupabaseClient } from "@supabase/supabase-js";

export async function createTeacherAccount(
  supabase: SupabaseClient,
  {
    email,
    firstName,
    lastName,
    institution,
    createdBy,
  }: {
    email: string;
    firstName: string;
    lastName: string;
    institution?: string;
    createdBy: string;
  }
) {
  try {
    const { data: invitedUser, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email);

    if (inviteError) throw inviteError;

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert([
        {
          id: invitedUser?.user?.id,
          role: "teacher",
          first_name: firstName,
          last_name: lastName,
          institution,
          verified: false,
          created_by: createdBy,
        },
      ])
      .select();

    if (profileError) throw profileError;

    return { success: true, user: profile[0] };
  } catch (err) {
    return { success: false, error: (err as Error).message || String(err) };
  }
}
