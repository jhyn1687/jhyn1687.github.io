import { supabase } from '../SupabaseClient';

async function getProjects() {
  try {
    let { data, error, status } = await supabase.from('projects').select().order('id', { ascending: false });

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

export default getProjects;
