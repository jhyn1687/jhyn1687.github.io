-- Drop tables left over from before the portfolio moved to `sections`.
--
-- The home page renders entirely from `sections` (hero, experience_list,
-- project_list), with content embedded in props.children. These predate that
-- and nothing in the app reads them any more:
--   experiences, projects  — migrated into experience_list / project_list
--   homeText               — superseded by the hero section's bio
--   quotes (+ random_quote) — the random-quote feature, not carried over
--   bills (+ make_bill_public) — the old account-based splitter, replaced by
--                                 the anonymous, expiring bill_shares
--
-- make_bill_public is dropped explicitly because a plpgsql body isn't a
-- tracked dependency — it would outlive `bills` and fail on first call.
-- No CASCADE: if something unexpected still depends on these, fail loudly.
DROP VIEW IF EXISTS random_quote;
DROP FUNCTION IF EXISTS make_bill_public(uuid, uuid);

DROP TABLE IF EXISTS experiences;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS "homeText";
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS bills;
