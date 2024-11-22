import { supabase } from "../SupabaseClient";

const getFileUrl = ({bucket = 'files', filePath, download = false}) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath, {
    download,
  });
  return data.publicUrl;
};

export default getFileUrl;