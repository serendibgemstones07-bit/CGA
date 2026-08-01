-- ============================================================
-- Ceylon Gem Identity (CGI) — Full Database Schema
-- Run this ENTIRE file in the Supabase SQL Editor for a new project
-- ============================================================

-- ── 1. ENABLE EXTENSIONS ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. PROFILES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role            TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  full_name       TEXT,
  phone           TEXT,
  whatsapp_number TEXT,
  extra_contacts  JSONB,
  avatar_url      TEXT,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
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

-- ── 3. ADMIN INVITES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 4. GEMSTONES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gemstones (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archive_number         TEXT UNIQUE,
  name                   TEXT NOT NULL,
  species                TEXT,
  variety                TEXT,
  origin                 TEXT,
  weight                 NUMERIC(10, 3),
  dimensions             TEXT,
  color                  TEXT,
  clarity                TEXT,
  cut                    TEXT,
  treatment              TEXT,
  certificate_number     TEXT,
  certificate_lab        TEXT,
  stone_state            TEXT CHECK (stone_state IN ('rough', 'cut_polished')),
  -- Cost breakdown
  purchase_currency      TEXT,
  purchase_price         NUMERIC(15, 2),
  rough_stone_price      NUMERIC(15, 2),
  rough_stone_weight     NUMERIC(10, 3),
  preforming_cost        NUMERIC(15, 2),
  cutting_polishing_cost NUMERIC(15, 2),
  buying_price           NUMERIC(15, 2),
  treatment_cost         NUMERIC(15, 2),
  certification_cost     NUMERIC(15, 2),
  other_costs            NUMERIC(15, 2),
  -- Selling
  selling_currency       TEXT,
  selling_price          NUMERIC(15, 2),
  buyer_currency         TEXT,
  buyer_price            NUMERIC(15, 2),
  sold_price             NUMERIC(15, 2),
  sold_currency          TEXT,
  -- Status
  status                 TEXT NOT NULL DEFAULT 'available'
                           CHECK (status IN ('available', 'sold', 'reserved', 'pending')),
  -- Notes
  internal_notes         TEXT,
  buyer_notes            TEXT,
  -- Audit
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-generate archive numbers: CGA-YYYY-0001
CREATE OR REPLACE FUNCTION public.generate_archive_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year    TEXT;
  v_seq     INTEGER;
BEGIN
  v_year := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY');
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

-- ── 5. GEMSTONE MEDIA TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gemstone_media (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id  UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'certificate', 'receipt')),
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
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

-- ── 6. BUYER SHARES TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buyer_shares (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id  UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  share_token  TEXT NOT NULL UNIQUE,
  caption      TEXT,
  expires_at   TIMESTAMPTZ,
  view_count   INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS buyer_shares_token_idx ON public.buyer_shares(share_token);
CREATE INDEX IF NOT EXISTS buyer_shares_gemstone_idx ON public.buyer_shares(gemstone_id);

-- ── 7. GEMSTONE HISTORY TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gemstone_history (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gemstone_id  UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  event_date   DATE,
  event_type   TEXT NOT NULL,
  location     TEXT,
  performed_by TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 8. SHARED COLLECTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shared_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  share_token     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  collection_type TEXT NOT NULL DEFAULT 'curated' CHECK (collection_type IN ('all', 'curated')),
  status_filter   TEXT[] DEFAULT '{"available"}',
  message         TEXT,
  expires_at      TIMESTAMPTZ,
  view_count      INTEGER DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shared_collection_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.shared_collections(id) ON DELETE CASCADE,
  gemstone_id   UUID NOT NULL REFERENCES public.gemstones(id) ON DELETE CASCADE,
  sort_order    INTEGER DEFAULT 0,
  UNIQUE(collection_id, gemstone_id)
);

-- ── 9. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstones               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstone_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_shares            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstone_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_collection_items ENABLE ROW LEVEL SECURITY;

-- ── PROFILES POLICIES ──
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update own profile or super_admin updates any"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admin can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── ADMIN INVITES POLICIES ──
CREATE POLICY "Authenticated can manage admin_invites"
  ON public.admin_invites FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Anon can read admin_invites"
  ON public.admin_invites FOR SELECT TO anon USING (TRUE);

-- ── GEMSTONES POLICIES ──
CREATE POLICY "Authenticated users can read gemstones"
  ON public.gemstones FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert gemstones"
  ON public.gemstones FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update gemstones"
  ON public.gemstones FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Super admins can delete gemstones"
  ON public.gemstones FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Anon can read gemstones via share"
  ON public.gemstones FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_shares
      WHERE gemstone_id = public.gemstones.id
        AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR EXISTS (
      SELECT 1 FROM public.shared_collections sc
      WHERE (sc.expires_at IS NULL OR sc.expires_at > NOW())
        AND (
          sc.collection_type = 'all'
          AND public.gemstones.status = ANY(sc.status_filter)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.shared_collection_items sci
      JOIN public.shared_collections sc ON sc.id = sci.collection_id
      WHERE sci.gemstone_id = public.gemstones.id
        AND sc.collection_type = 'curated'
        AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
    )
  );

-- ── GEMSTONE MEDIA POLICIES ──
CREATE POLICY "Authenticated can manage gemstone media"
  ON public.gemstone_media FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "Anon can read gemstone media via share"
  ON public.gemstone_media FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.buyer_shares bs
      WHERE bs.gemstone_id = public.gemstone_media.gemstone_id
        AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
    )
    OR EXISTS (
      SELECT 1 FROM public.shared_collections sc
      WHERE (sc.expires_at IS NULL OR sc.expires_at > NOW())
        AND sc.collection_type = 'all'
    )
    OR EXISTS (
      SELECT 1 FROM public.shared_collection_items sci
      JOIN public.shared_collections sc ON sc.id = sci.collection_id
      WHERE sci.gemstone_id = public.gemstone_media.gemstone_id
        AND sc.collection_type = 'curated'
        AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
    )
  );

-- ── BUYER SHARES POLICIES ──
CREATE POLICY "Authenticated can manage buyer shares"
  ON public.buyer_shares FOR ALL TO authenticated USING (TRUE);

CREATE POLICY "Anon can read buyer shares"
  ON public.buyer_shares FOR SELECT TO anon USING (TRUE);

CREATE POLICY "Anon can update share view count"
  ON public.buyer_shares FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);

-- ── GEMSTONE HISTORY POLICIES ──
CREATE POLICY "Authenticated can manage gemstone history"
  ON public.gemstone_history FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ── SHARED COLLECTIONS POLICIES ──
CREATE POLICY "Authenticated users can manage shared_collections"
  ON public.shared_collections FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Public can view shared_collections"
  ON public.shared_collections FOR SELECT TO anon USING (TRUE);

CREATE POLICY "Anon can update collection view count"
  ON public.shared_collections FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can manage shared_collection_items"
  ON public.shared_collection_items FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Public can view shared_collection_items"
  ON public.shared_collection_items FOR SELECT TO anon USING (TRUE);

-- ── 10. STORAGE BUCKET ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('gemstone-media', 'gemstone-media', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gemstone-media');

CREATE POLICY "Authenticated users can update media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gemstone-media');

CREATE POLICY "Authenticated users can delete media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gemstone-media');

CREATE POLICY "Anyone can view media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gemstone-media');

-- ── 11. INITIAL SETUP ────────────────────────────────────────
-- After creating your first user via Supabase Auth, run:
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = '<your-user-uuid>';
