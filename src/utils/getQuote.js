import { supabase } from '../SupabaseClient';

async function getQuote() {
  try {
    let { data, error, status } = await supabase.from('random_quote').select('quote').limit(1).single();

    if (error && status !== 406) {
      throw error;
    }

    if (data) {
      return data.quote;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      alert(error.message);
    }
    return null;
  }
}

export default getQuote;
