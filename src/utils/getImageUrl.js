import { supabase } from "../SupabaseClient";

const getImageUrl = ({bucket = 'images', filePath}) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

export default getImageUrl;