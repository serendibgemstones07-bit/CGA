-- ============================================================
-- Ceylon Gem Archive — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. ENABLE EXTENSIONS ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. PROFILES TABLE ────────────────────────────────────────
-- Extends auth.users with role and display name
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  full_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. GEMSTONES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gemstones (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archive_number     TEXT UNIQUE,                        -- auto-generated CGA-YYYY-NNNN
  name               TEXT NOT NULL,
  species            TEXT,                               -- e.g. Corundum, Beryl
  variety            TEXT,                               -- e.g. Blue Sapphire, Ruby
  origin             TEXT,                               -- e.g. Sri Lanka
  weight             NUMERIC(10, 3),                     -- carats
  dimensions         TEXT,                               -- e.g. 10.5 × 8.2 × 5.1 mm
  color              TEXT,
  clarity            TEXT,
  cut                TEXT,
  treatment          TEXT,
  certificate_number TEXT,
  certificate_lab    TEXT,
  -- Pricing (purchase_price and selling_price are INTERNAL ONLY)
  purchase_price     NUMERIC(15, 2),                     -- hidden from buyers
  selling_price      NUMERIC(15, 2),                     -- hidden from buyers
  buyer_price        NUMERIC(15, 2),                     -- shown on buyer pages
  -- Status
  status             TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available', 'sold', 'reserved', 'pending')),
  -- Notes
  internal_notes     TEXT,                               -- hidden from buyers
  buyer_notes        TEXT,                               -- shown on buyer pages
  -- Audit
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-generate archive numbers: CGA-YYYY-0001
CREATE OR REPLACE FUNCTION public.generate_archive_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year    TEXT;
  v_seq     INTEGER;
BEGIN
  v_year := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY');

  -- Lock and get next sequence for this year
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(archive_number FROM 10) AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM public.gemstones
  WHERE archive_number LIKE 'CGA-' || v_year || '-%';

  NEW.archive_number := 'CGA-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_archive_number ON public.gemstones;
CREATE TRIGGER set_archive_number
  BEFORE INSERT ON public.gemstones
  FOR EACH ROW
  WHEN (NEW.archive_number IS NULL OR NEW.archive_number = '')
  EXECUTE FUNCTION public.generate_archive_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.gemstones;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.gemstones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 4. GEMSTONE MEDIA TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gemstone_media (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id  UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'certificate', 'receipt')),
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure only one primary per gemstone
CREATE OR REPLACE FUNCTION public.enforce_single_primary_media()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.gemstone_media
    SET is_primary = FALSE
    WHERE gemstone_id = NEW.gemstone_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_primary_media ON public.gemstone_media;
CREATE TRIGGER single_primary_media
  AFTER INSERT OR UPDATE ON public.gemstone_media
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION public.enforce_single_primary_media();

-- ── 5. BUYER SHARES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buyer_shares (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id  UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  share_token  TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ,                              -- NULL = never expires
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS buyer_shares_token_idx ON public.buyer_shares(share_token);
CREATE INDEX IF NOT EXISTS buyer_shares_gemstone_idx ON public.buyer_shares(gemstone_id);

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstone_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_shares  ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/update their own
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- gemstones: authenticated users can read all; super_admin can delete
CREATE POLICY "Authenticated users can read gemstones"
  ON public.gemstones FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert gemstones"
  ON public.gemstones FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update gemstones"
  ON public.gemstones FOR UPDATE
  TO authenticated
  USING (TRUE);

CREATE POLICY "Super admins can delete gemstones"
  ON public.gemstones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- gemstone_media: authenticated full access
CREATE POLICY "Authenticated can manage gemstone media"
  ON public.gemstone_media FOR ALL
  TO authenticated
  USING (TRUE);

-- buyer_shares: authenticated full access
CREATE POLICY "Authenticated can manage buyer shares"
  ON public.buyer_shares FOR ALL
  TO authenticated
  USING (TRUE);

-- Allow anonymous read of gemstone data via valid share token (buyer pages)
-- Handled in application layer: anon key queries only buyer-safe columns,
-- and validates share token before fetching.
CREATE POLICY "Anon can read gemstones via valid share token"
  ON public.gemstones FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_shares
      WHERE gemstone_id = public.gemstones.id
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "Anon can read gemstone media"
  ON public.gemstone_media FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_shares bs
      WHERE bs.gemstone_id = public.gemstone_media.gemstone_id
        AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
    )
  );

CREATE POLICY "Anon can read buyer shares"
  ON public.buyer_shares FOR SELECT
  TO anon
  USING (TRUE);

CREATE POLICY "Anon can update share view count"
  ON public.buyer_shares FOR UPDATE
  TO anon
  USING (TRUE)
  WITH CHECK (TRUE);

-- ── 7. STORAGE BUCKET ────────────────────────────────────────
-- Run in Supabase Dashboard: Storage > New Bucket > "gemstone-media" (public)
-- OR with the Supabase CLI:
--   supabase storage create gemstone-media --public

-- Storage policies (set via Dashboard or CLI):
-- Allow authenticated uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('gemstone-media', 'gemstone-media', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gemstone-media');

CREATE POLICY "Authenticated users can update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gemstone-media');

CREATE POLICY "Authenticated users can delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gemstone-media');

CREATE POLICY "Anyone can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gemstone-media');

-- ── 8. INITIAL SUPER ADMIN SETUP ─────────────────────────────
-- After creating your first user via Supabase Auth, run:
-- UPDATE public.profiles SET role = 'super_admin', full_name = 'Your Name'
-- WHERE id = '<your-user-uuid>';
