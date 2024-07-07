import { supabase } from "../SupabaseClient";

async function getExperiences() {
  try {
    let { data, error, status } = await supabase
      .from("experiences")
      .select()
      .order("id", { ascending: false });

    if (error && status !== 406) {
      throw error;
    }

    if (data) {
      return data;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      alert(error.message);
    }
    return null;
  }
}

export default getExperiences;