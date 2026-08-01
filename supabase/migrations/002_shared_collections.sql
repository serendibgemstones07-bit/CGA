-- Shared Collections for inventory sharing
CREATE TABLE IF NOT EXISTS shared_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  collection_type TEXT NOT NULL DEFAULT 'curated' CHECK (collection_type IN ('all', 'curated')),
  status_filter TEXT[] DEFAULT '{"available"}',
  message TEXT,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES shared_collections(id) ON DELETE CASCADE,
  gemstone_id UUID NOT NULL REFERENCES gemstones(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(collection_id, gemstone_id)
);

ALTER TABLE shared_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage shared_collections"
  ON shared_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view shared_collections by token"
  ON shared_collections FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated users can manage shared_collection_items"
  ON shared_collection_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can view shared_collection_items"
  ON shared_collection_items FOR SELECT TO anon USING (true);
