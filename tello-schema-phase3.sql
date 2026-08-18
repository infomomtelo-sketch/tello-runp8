-- Tello Phase 3: Public share links (additive to Phase 1 + 2)
-- RUN IN SUPABASE SQL EDITOR AFTER Phase 2
--
-- Why a function instead of an RLS policy:
-- The anon key ships in the browser bundle, so a permissive SELECT policy like
-- USING (share_token IS NOT NULL) would let anyone request tello_decisions with
-- no filter and dump every shared decision. The client-side .eq('share_token', ...)
-- is not a security boundary. This SECURITY DEFINER function takes the token as an
-- argument, so a caller can only ever retrieve a decision whose token they already
-- hold, and only the columns listed below.

CREATE OR REPLACE FUNCTION public.get_shared_decision(p_share_token TEXT)
RETURNS TABLE (
  title      TEXT,
  context    TEXT,
  options    JSONB,
  decision   TEXT,
  reasoning  TEXT,
  outcome    TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.title, d.context, d.options, d.decision, d.reasoning, d.outcome, d.created_at
  FROM public.tello_decisions d
  WHERE d.share_token = p_share_token
    AND p_share_token IS NOT NULL
    AND length(p_share_token) >= 16;
$$;

-- Only anon + authenticated may call it; nothing else inherits execute.
REVOKE ALL ON FUNCTION public.get_shared_decision(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_decision(TEXT) TO anon, authenticated;

-- Revoking a share link: clear the token and the link stops resolving immediately.
--   UPDATE tello_decisions SET share_token = NULL WHERE id = '<decision-id>';

-- Verify Phase 3
SELECT
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_shared_decision';
