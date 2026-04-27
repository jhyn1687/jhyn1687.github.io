-- Drop global cap gate; only per-IP limit (10/month) remains
CREATE OR REPLACE FUNCTION check_and_increment_ocr(
  p_month  TEXT,
  p_ip_key TEXT,
  p_ip_cap INT DEFAULT 10
) RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO ocr_usage (month, client_key, count)
    VALUES (p_month, p_ip_key, 1)
  ON CONFLICT (month, client_key) DO UPDATE
    SET count = ocr_usage.count + 1
    WHERE ocr_usage.count < p_ip_cap;

  RETURN QUERY SELECT FOUND;
END;
$$;
