import { supabase } from "../SupabaseClient";

const getFileUrl = ({bucket = 'files', filePath}) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
};

export default getFileUrl;