-- Track who edited gemstones and what changed
CREATE TABLE IF NOT EXISTS public.gemstone_edits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  edited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  summary     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS gemstone_edits_gemstone_idx ON public.gemstone_edits(gemstone_id);

ALTER TABLE public.gemstone_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage gemstone_edits"
  ON public.gemstone_edits FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
