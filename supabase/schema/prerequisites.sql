-- Run in the production project's SQL editor as postgres.
-- Required for the existing Ticketing schema owner; no Auth schema permissions needed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO sessiontrack_limweijian;
GRANT EXECUTE ON FUNCTION extensions.gen_random_bytes(integer),
  extensions.digest(text, text) TO sessiontrack_limweijian;
COMMIT;
