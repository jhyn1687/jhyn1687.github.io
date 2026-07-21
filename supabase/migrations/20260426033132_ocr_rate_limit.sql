-- OCR rate limiting: per-IP (10/month) and global (900/month)
-- client_key is either a truncated SHA-256 hash of the IP or 'global'

CREATE TABLE IF NOT EXISTS ocr_usage (
  month      TEXT NOT NULL,
  client_key TEXT NOT NULL,
  count      INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (month, client_key)
);

ALTER TABLE ocr_usage ENABLE ROW LEVEL SECURITY;
-- No public policies — table is only accessible via the SECURITY DEFINER function below

CREATE OR REPLACE FUNCTION check_and_increment_ocr(
  p_month      TEXT,
  p_ip_key     TEXT,
  p_global_cap INT DEFAULT 900,
  p_ip_cap     INT DEFAULT 10
) RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Gate 1: per-IP limit (checked first so one user can't exhaust the global quota)
  INSERT INTO ocr_usage (month, client_key, count)
    VALUES (p_month, p_ip_key, 1)
  ON CONFLICT (month, client_key) DO UPDATE
    SET count = ocr_usage.count + 1
    WHERE ocr_usage.count < p_ip_cap;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;

  -- Gate 2: global monthly cap
  INSERT INTO ocr_usage (month, client_key, count)
    VALUES (p_month, 'global', 1)
  ON CONFLICT (month, client_key) DO UPDATE
    SET count = ocr_usage.count + 1
    WHERE ocr_usage.count < p_global_cap;

  IF NOT FOUND THEN
    -- Roll back the IP increment to keep counts consistent
    UPDATE ocr_usage
      SET count = count - 1
      WHERE month = p_month AND client_key = p_ip_key;
    RETURN QUERY SELECT false;
    RETURN;
  END IF;

  RETURN QUERY SELECT true;
END;
$$;
