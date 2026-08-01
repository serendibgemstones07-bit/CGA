export type UserRole = 'super_admin' | 'admin';

export type GemstoneStatus = 'available' | 'sold' | 'reserved' | 'pending';

export interface ExtraContact {
  type: 'phone' | 'viber' | 'telegram' | 'wechat' | 'signal' | 'email' | 'website' | 'other';
  label: string;
  value: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  status: 'active' | 'blocked';
  full_name: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  extra_contacts: ExtraContact[] | null;
  avatar_url: string | null;
  invited_by: string | null;
  created_at: string;
}

export interface AdminInvite {
  id: string;
  email: string;
  token: string;
  created_by: string;
  used: boolean;
  created_at: string;
}

export type StoneState = 'rough' | 'cut_polished';

export interface Gemstone {
  id: string;
  archive_number: string;
  name: string;
  species: string | null;
  variety: string | null;
  origin: string | null;
  weight: number | null;
  dimensions: string | null;
  color: string | null;
  clarity: string | null;
  cut: string | null;
  treatment: string | null;
  certificate_number: string | null;
  certificate_lab: string | null;
  stone_state: StoneState | null;
  purchase_currency: string | null;
  purchase_price: number | null;
  rough_stone_price: number | null;
  rough_stone_weight: number | null;
  preforming_cost: number | null;
  cutting_polishing_cost: number | null;
  buying_price: number | null;
  treatment_cost: number | null;
  certification_cost: number | null;
  other_costs: number | null;
  selling_currency: string | null;
  selling_price: number | null;
  buyer_currency: string | null;
  buyer_price: number | null;
  sold_price: number | null;
  sold_currency: string | null;
  status: GemstoneStatus;
  internal_notes: string | null;
  buyer_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  gemstone_media?: GemstoneMedia[];
}

export interface GemstoneMedia {
  id: string;
  gemstone_id: string;
  url: string;
  storage_path: string;
  media_type: 'image' | 'video' | 'certificate' | 'receipt';
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface BuyerShare {
  id: string;
  gemstone_id: string;
  share_token: string;
  caption: string | null;
  expires_at: string | null;
  view_count: number;
  created_by: string | null;
  created_at: string;
  gemstone?: Gemstone;
}

export interface GemstoneHistory {
  id: string;
  gemstone_id: string;
  event_date: string | null;
  event_type: string;
  location: string | null;
  performed_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DashboardStats {
  total: number;
  available: number;
  sold: number;
  reserved: number;
  pending: number;
}

export type GemstoneFormData = Omit<Gemstone, 'id' | 'archive_number' | 'created_at' | 'updated_at' | 'gemstone_media'>;

export interface GemstoneEdit {
  id: string;
  gemstone_id: string;
  edited_by: string;
  editor_name?: string;
  summary: string;
  created_at: string;
}

export interface SharedCollection {
  id: string;
  name: string;
  share_token: string;
  collection_type: 'all' | 'curated';
  status_filter: string[];
  message: string | null;
  expires_at: string | null;
  view_count: number;
  created_by: string | null;
  created_at: string;
}

export interface SharedCollectionItem {
  id: string;
  collection_id: string;
  gemstone_id: string;
  sort_order: number;
}
