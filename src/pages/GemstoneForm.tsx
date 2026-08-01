import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload, X, Image as ImageIcon, Gem, ChevronLeft,
  AlertCircle, CheckCircle, Trash2, Star, ArrowLeft, ArrowRight,
  Clock, Plus, Edit as EditIcon, Receipt, Award, Upload as UploadIcon,
} from 'lucide-react';
import { supabase, STORAGE_BUCKET } from '../lib/supabase';
import type { Gemstone, GemstoneMedia, GemstoneHistory, GemstoneStatus, StoneState } from '../types';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const ORIGIN_OPTIONS = ['Sri Lanka', 'Myanmar', 'Thailand', 'Cambodia', 'India', 'Colombia', 'Brazil', 'Mozambique', 'Tanzania', 'Madagascar', 'Australia', 'USA', 'Other'];
const SPECIES_OPTIONS = ['Corundum', 'Beryl', 'Chrysoberyl', 'Spinel', 'Tourmaline', 'Garnet', 'Quartz', 'Topaz', 'Zircon', 'Tanzanite', 'Other'];
const CUT_OPTIONS = ['Round Brilliant', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart', 'Princess', 'Radiant', 'Cabochon', 'Rough', 'Other'];
const CLARITY_OPTIONS = ['Loupe Clean', 'Eye Clean', 'Slightly Included', 'Moderately Included', 'Heavily Included'];
const TREATMENT_OPTIONS = ['None', 'Heat Treated', 'Beryllium Treated', 'Fracture Filled', 'Lead Glass Filled', 'Oiled', 'Irradiated', 'Coating', 'Other'];
const LAB_OPTIONS = ['GIA', 'AGL', 'Gübelin', 'SSEF', 'GRS', 'IGI', 'AIGS', 'Lotus Gemology', 'On Request', 'None'];

interface UploadedFile {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
  savedMedia?: GemstoneMedia;
}

type FormValues = {
  name: string;
  species: string;
  variety: string;
  origin: string;
  weight: string;
  dimensions: string;
  color: string;
  clarity: string;
  cut: string;
  treatment: string;
  certificate_number: string;
  certificate_lab: string;
  stone_state: StoneState;
  purchase_currency: string;
  rough_stone_price: string;
  rough_stone_weight: string;
  preforming_cost: string;
  cutting_polishing_cost: string;
  buying_price: string;
  treatment_cost: string;
  certification_cost: string;
  other_costs: string;
  selling_currency: string;
  selling_price: string;
  buyer_currency: string;
  buyer_price: string;
  sold_currency: string;
  sold_price: string;
  status: GemstoneStatus;
  internal_notes: string;
  buyer_notes: string;
};

const emptyForm: FormValues = {
  name: '', species: '', variety: '', origin: '',
  weight: '', dimensions: '', color: '', clarity: '', cut: '',
  treatment: 'None', certificate_number: '', certificate_lab: 'None',
  stone_state: 'rough',
  purchase_currency: 'USD',
  rough_stone_price: '', rough_stone_weight: '', preforming_cost: '',
  cutting_polishing_cost: '', buying_price: '',
  treatment_cost: '', certification_cost: '', other_costs: '',
  selling_currency: 'USD', selling_price: '', buyer_currency: 'USD', buyer_price: '',
  sold_currency: 'USD', sold_price: '',
  status: 'available', internal_notes: '', buyer_notes: '',
};

interface Props {
  mode: 'add' | 'edit';
}

export function GemstoneForm({ mode }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormValues>(emptyForm);
  const originalFormRef = useRef<FormValues>(emptyForm);
  const [existingMedia, setExistingMedia] = useState<GemstoneMedia[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingGem, setLoadingGem] = useState(mode === 'edit');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [archiveNumber, setArchiveNumber] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, boolean>>({});
  const [convertCurrency, setConvertCurrency] = useState('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [ratesBase, setRatesBase] = useState('');
  const [history, setHistory] = useState<GemstoneHistory[]>([]);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
  const [savingHistory, setSavingHistory] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editHistoryForm, setEditHistoryForm] = useState({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
  const [receipts, setReceipts] = useState<GemstoneMedia[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [certificates, setCertificates] = useState<GemstoneMedia[]>([]);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const base = form.purchase_currency || 'USD';
    if (convertCurrency && base !== ratesBase) {
      fetch(`https://open.er-api.com/v6/latest/${base}`)
        .then(r => r.json())
        .then(data => { if (data.rates) { setExchangeRates(data.rates); setRatesBase(base); } })
        .catch(() => {});
    }
  }, [convertCurrency, form.purchase_currency]);

  useEffect(() => {
    if (mode === 'edit' && id) {
      supabase.from('gemstones').select('*, gemstone_media(*)').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            const g = data as Gemstone;
            setArchiveNumber(g.archive_number ?? '');
            setForm({
              name: g.name ?? '',
              species: g.species ?? '',
              variety: g.variety ?? '',
              origin: g.origin ?? '',
              weight: g.weight?.toString() ?? '',
              dimensions: g.dimensions ?? '',
              color: g.color ?? '',
              clarity: g.clarity ?? '',
              cut: g.cut ?? '',
              treatment: g.treatment ?? 'None',
              certificate_number: g.certificate_number ?? '',
              certificate_lab: g.certificate_lab ?? 'None',
              stone_state: g.stone_state ?? 'rough',
              purchase_currency: g.purchase_currency ?? 'USD',
              rough_stone_price: g.rough_stone_price?.toString() ?? '',
              rough_stone_weight: g.rough_stone_weight?.toString() ?? '',
              preforming_cost: g.preforming_cost?.toString() ?? '',
              cutting_polishing_cost: g.cutting_polishing_cost?.toString() ?? '',
              buying_price: g.buying_price?.toString() ?? '',
              treatment_cost: g.treatment_cost?.toString() ?? '',
              certification_cost: g.certification_cost?.toString() ?? '',
              other_costs: g.other_costs?.toString() ?? '',
              selling_currency: g.selling_currency ?? 'USD',
              selling_price: g.selling_price?.toString() ?? '',
              buyer_currency: g.buyer_currency ?? 'USD',
              buyer_price: g.buyer_price?.toString() ?? '',
              sold_currency: g.sold_currency ?? 'USD',
              sold_price: g.sold_price?.toString() ?? '',
              status: g.status,
              internal_notes: g.internal_notes ?? '',
              buyer_notes: g.buyer_notes ?? '',
            });
            originalFormRef.current = {
              name: g.name ?? '', species: g.species ?? '', variety: g.variety ?? '',
              origin: g.origin ?? '', weight: g.weight?.toString() ?? '',
              dimensions: g.dimensions ?? '', color: g.color ?? '', clarity: g.clarity ?? '',
              cut: g.cut ?? '', treatment: g.treatment ?? 'None',
              certificate_number: g.certificate_number ?? '', certificate_lab: g.certificate_lab ?? 'None',
              stone_state: g.stone_state ?? 'rough', purchase_currency: g.purchase_currency ?? 'USD',
              rough_stone_price: g.rough_stone_price?.toString() ?? '', rough_stone_weight: g.rough_stone_weight?.toString() ?? '',
              preforming_cost: g.preforming_cost?.toString() ?? '', cutting_polishing_cost: g.cutting_polishing_cost?.toString() ?? '',
              buying_price: g.buying_price?.toString() ?? '', treatment_cost: g.treatment_cost?.toString() ?? '',
              certification_cost: g.certification_cost?.toString() ?? '', other_costs: g.other_costs?.toString() ?? '',
              selling_currency: g.selling_currency ?? 'USD', selling_price: g.selling_price?.toString() ?? '',
              buyer_currency: g.buyer_currency ?? 'USD', buyer_price: g.buyer_price?.toString() ?? '',
              sold_currency: g.sold_currency ?? 'USD', sold_price: g.sold_price?.toString() ?? '',
              status: g.status, internal_notes: g.internal_notes ?? '', buyer_notes: g.buyer_notes ?? '',
            };
            setExistingMedia([...(g.gemstone_media ?? [])].filter(m => m.media_type !== 'receipt' && m.media_type !== 'certificate').sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
          }
          setLoadingGem(false);
        });
      loadHistory();
      loadReceipts();
      loadCertificates();
    }
  }, [mode, id]);

  async function loadHistory() {
    if (!id) return;
    const { data } = await supabase.from('gemstone_history').select('*').eq('gemstone_id', id).order('event_date', { ascending: true, nullsFirst: false });
    setHistory((data as GemstoneHistory[]) ?? []);
  }

  async function addHistoryEntry() {
    if (!id || !historyForm.event_type) return;
    setSavingHistory(true);
    await supabase.from('gemstone_history').insert({
      gemstone_id: id,
      event_type: historyForm.event_type,
      event_date: historyForm.event_date || null,
      location: historyForm.location || null,
      performed_by: historyForm.performed_by || null,
      notes: historyForm.notes || null,
    });
    setHistoryForm({ event_type: '', event_date: '', location: '', performed_by: '', notes: '' });
    setShowHistoryForm(false);
    setSavingHistory(false);
    loadHistory();
  }

  async function deleteHistoryEntry(entryId: string) {
    if (!window.confirm('Delete this history entry?')) return;
    await supabase.from('gemstone_history').delete().eq('id', entryId);
    loadHistory();
  }

  function startEditHistory(entry: GemstoneHistory) {
    setEditingHistoryId(entry.id);
    setEditHistoryForm({
      event_type: entry.event_type,
      event_date: entry.event_date ?? '',
      location: entry.location ?? '',
      performed_by: entry.performed_by ?? '',
      notes: entry.notes ?? '',
    });
  }

  async function saveEditHistory() {
    if (!editingHistoryId || !editHistoryForm.event_type) return;
    setSavingHistory(true);
    await supabase.from('gemstone_history').update({
      event_type: editHistoryForm.event_type,
      event_date: editHistoryForm.event_date || null,
      location: editHistoryForm.location || null,
      performed_by: editHistoryForm.performed_by || null,
      notes: editHistoryForm.notes || null,
    }).eq('id', editingHistoryId);
    setEditingHistoryId(null);
    setSavingHistory(false);
    loadHistory();
  }

  async function loadReceipts() {
    if (!id) return;
    const { data } = await supabase.from('gemstone_media').select('*').eq('gemstone_id', id).eq('media_type', 'receipt').order('created_at', { ascending: true });
    setReceipts((data as GemstoneMedia[]) ?? []);
  }

  async function loadCertificates() {
    if (!id) return;
    const { data } = await supabase.from('gemstone_media').select('*').eq('gemstone_id', id).eq('media_type', 'certificate').order('created_at', { ascending: true });
    setCertificates((data as GemstoneMedia[]) ?? []);
  }

  async function handleCertUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !id) return;
    setUploadingCert(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${id}/certificates/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      if (uploadErr) { console.error('Storage upload error:', uploadErr); continue; }
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      await supabase.from('gemstone_media').insert({
        gemstone_id: id,
        url: publicUrl,
        storage_path: path,
        media_type: 'certificate',
        is_primary: false,
        sort_order: 999,
      });
    }
    setUploadingCert(false);
    if (certInputRef.current) certInputRef.current.value = '';
    loadCertificates();
  }

  async function deleteCertificate(cert: GemstoneMedia) {
    if (!window.confirm('Delete this certificate image?')) return;
    await supabase.storage.from(STORAGE_BUCKET).remove([cert.storage_path]);
    await supabase.from('gemstone_media').delete().eq('id', cert.id);
    loadCertificates();
  }

  async function handleReceiptUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !id) return;
    setUploadingReceipt(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${id}/receipts/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      if (uploadErr) { console.error('Storage upload error:', uploadErr); continue; }
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { error: insertErr } = await supabase.from('gemstone_media').insert({
        gemstone_id: id,
        url: publicUrl,
        storage_path: path,
        media_type: 'receipt',
        is_primary: false,
        sort_order: 999,
      });
      if (insertErr) console.error('Insert error:', insertErr);
    }
    setUploadingReceipt(false);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
    loadReceipts();
  }

  async function deleteReceipt(receipt: GemstoneMedia) {
    if (!window.confirm('Delete this receipt?')) return;
    await supabase.storage.from(STORAGE_BUCKET).remove([receipt.storage_path]);
    await supabase.from('gemstone_media').delete().eq('id', receipt.id);
    loadReceipts();
  }

  function setField(field: keyof FormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newUploads: UploadedFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    setUploads(prev => [...prev, ...newUploads]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeUpload(idx: number) {
    setUploads(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function removeExistingMedia(media: GemstoneMedia) {
    await supabase.storage.from(STORAGE_BUCKET).remove([media.storage_path]);
    await supabase.from('gemstone_media').delete().eq('id', media.id);
    setExistingMedia(prev => prev.filter(m => m.id !== media.id));
  }

  async function setPrimaryMedia(mediaId: string) {
    await supabase.from('gemstone_media').update({ is_primary: false }).eq('gemstone_id', id);
    await supabase.from('gemstone_media').update({ is_primary: true }).eq('id', mediaId);
    setExistingMedia(prev => prev.map(m => ({ ...m, is_primary: m.id === mediaId })));
  }

  async function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= existingMedia.length) return;
    const reordered = [...existingMedia];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setExistingMedia(reordered);
    await Promise.all(reordered.map((m, i) =>
      supabase.from('gemstone_media').update({ sort_order: i }).eq('id', m.id)
    ));
  }

  async function uploadFiles(gemstoneId: string) {
    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, uploading: true } : u));

      const ext = upload.file.name.split('.').pop();
      const path = `${gemstoneId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, upload.file, { contentType: upload.file.type });

      if (uploadError) {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, uploading: false, error: uploadError.message } : u));
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

      const isPrimary = existingMedia.length === 0 && i === 0;
      const mediaType = upload.file.type.startsWith('video') ? 'video' : 'image';

      const { data: savedMedia } = await supabase.from('gemstone_media').insert({
        gemstone_id: gemstoneId,
        url: publicUrl,
        storage_path: path,
        media_type: mediaType,
        is_primary: isPrimary,
      }).select().single();

      setUploads(prev => prev.map((u, idx) =>
        idx === i ? { ...u, uploading: false, savedMedia: savedMedia as GemstoneMedia } : u
      ));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Gemstone name is required.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const num = (v: string) => v ? parseFloat(v) : null;
    const costFields = form.stone_state === 'rough'
      ? [form.rough_stone_price, form.preforming_cost, form.cutting_polishing_cost, form.treatment_cost, form.certification_cost, form.other_costs]
      : [form.buying_price, form.treatment_cost, form.certification_cost, form.other_costs];
    const totalPurchase = costFields.reduce((sum, v) => sum + (v ? parseFloat(v) || 0 : 0), 0);

    const payload = {
      name: form.name.trim(),
      species: form.species || null,
      variety: form.variety || null,
      origin: form.origin || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      dimensions: form.dimensions || null,
      color: form.color || null,
      clarity: form.clarity || null,
      cut: form.cut || null,
      treatment: form.treatment || null,
      certificate_number: form.certificate_number || null,
      certificate_lab: form.certificate_lab || null,
      stone_state: form.stone_state,
      purchase_currency: form.purchase_currency || 'USD',
      purchase_price: totalPurchase || null,
      rough_stone_price: num(form.rough_stone_price),
      rough_stone_weight: num(form.rough_stone_weight),
      preforming_cost: num(form.preforming_cost),
      cutting_polishing_cost: num(form.cutting_polishing_cost),
      buying_price: num(form.buying_price),
      treatment_cost: num(form.treatment_cost),
      certification_cost: num(form.certification_cost),
      other_costs: num(form.other_costs),
      selling_currency: form.selling_currency || 'USD',
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
      buyer_currency: form.buyer_currency || 'USD',
      buyer_price: form.buyer_price ? parseFloat(form.buyer_price) : null,
      sold_currency: form.sold_currency || 'USD',
      sold_price: form.sold_price ? parseFloat(form.sold_price) : null,
      status: form.status,
      internal_notes: form.internal_notes || null,
      buyer_notes: form.buyer_notes || null,
      updated_at: new Date().toISOString(),
    };

    let gemstoneId = id;

    if (mode === 'add') {
      const { data, error: insertError } = await supabase
        .from('gemstones')
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
      gemstoneId = data.id;
    } else {
      const { error: updateError } = await supabase
        .from('gemstones')
        .update(payload)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Log what changed
      const fieldLabels: Record<string, string> = {
        name: 'Name', species: 'Species', variety: 'Variety', origin: 'Origin',
        weight: 'Weight', dimensions: 'Dimensions', color: 'Color', clarity: 'Clarity',
        cut: 'Cut', treatment: 'Treatment', certificate_number: 'Certificate Number',
        certificate_lab: 'Certificate Lab', stone_state: 'Stone State', status: 'Status',
        purchase_currency: 'Purchase Currency', rough_stone_price: 'Rough Stone Price',
        rough_stone_weight: 'Rough Stone Weight', preforming_cost: 'Preforming Cost',
        cutting_polishing_cost: 'Cutting/Polishing Cost', buying_price: 'Buying Price',
        treatment_cost: 'Treatment Cost', certification_cost: 'Certification Cost',
        other_costs: 'Other Costs', selling_currency: 'Selling Currency',
        selling_price: 'Selling Price', buyer_currency: 'Buyer Currency',
        buyer_price: 'Buyer Price', sold_currency: 'Sold Currency', sold_price: 'Sold Price',
        internal_notes: 'Internal Notes', buyer_notes: 'Buyer Notes',
      };
      const changed: string[] = [];
      for (const key of Object.keys(fieldLabels) as (keyof FormValues)[]) {
        if (form[key] !== originalFormRef.current[key]) {
          changed.push(fieldLabels[key] || key);
        }
      }
      if (changed.length > 0 && user) {
        const summary = changed.length <= 3
          ? `Updated ${changed.join(', ')}`
          : `Updated ${changed.length} fields: ${changed.slice(0, 3).join(', ')} and ${changed.length - 3} more`;
        await supabase.from('gemstone_edits').insert({
          gemstone_id: id,
          edited_by: user.id,
          summary,
        });
      }
    }

    if (uploads.length > 0 && gemstoneId) {
      await uploadFiles(gemstoneId);
    }

    setSaving(false);
    setSuccess(mode === 'add' ? 'Gemstone added successfully!' : 'Gemstone updated successfully!');
    setTimeout(() => navigate(`/gemstones/${gemstoneId}`), 1000);
  }

  if (loadingGem) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  function renderField(label: string, field: keyof FormValues, type = 'text', placeholder = '', list?: string[]) {
    const isCustom = list && (customFields[field] || (form[field] !== '' && !list.includes(form[field] as string)));
    return (
      <div>
        <label className="label-text">{label}</label>
        {list && !isCustom ? (
          <select
            value={form[field]}
            onChange={e => {
              if (e.target.value === '__custom__') {
                setCustomFields(p => ({ ...p, [field]: true }));
                setField(field, '');
              } else {
                setField(field, e.target.value);
              }
            }}
            className="input-field"
          >
            <option value="">Select…</option>
            {list.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="__custom__">Custom…</option>
          </select>
        ) : list && isCustom ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={form[field]}
              onChange={e => setField(field, e.target.value)}
              placeholder="Type custom value…"
              className="input-field flex-1"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { setCustomFields(p => ({ ...p, [field]: false })); setField(field, ''); }}
              className="btn-ghost px-3 text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            type={type}
            value={form[field]}
            onChange={e => setField(field, e.target.value)}
            placeholder={placeholder}
            className="input-field"
            step={type === 'number' ? 'any' : undefined}
            min={type === 'number' ? '0' : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">
            {mode === 'add' ? 'Add New Gemstone' : 'Edit Gemstone'}
            {mode === 'edit' && archiveNumber && (
              <span className="ml-3 text-base font-normal text-amber-400">{archiveNumber}</span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {mode === 'add' ? 'Archive number will be auto-generated.' : `Editing details for this record.`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-5 flex items-center gap-2">
            <Gem className="w-5 h-5 text-yellow-400" /> Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              {renderField("Gemstone Name *", "name", "text", "e.g. Unheated Ceylon Sapphire")}
            </div>
            {renderField("Species", "species", "text", "", SPECIES_OPTIONS)}
            {renderField("Variety", "variety", "text", "e.g. Blue Sapphire, Ruby")}
            {renderField("Origin", "origin", "text", "", ORIGIN_OPTIONS)}
            <div>
              <label className="label-text">Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value as GemstoneStatus)} className="input-field">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Physical */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-5">Physical Properties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Weight (carats)", "weight", "number", "e.g. 5.23")}
            {renderField("Dimensions (mm)", "dimensions", "text", "e.g. 10.5 × 8.2 × 5.1")}
            {renderField("Color", "color", "text", "e.g. Vivid Royal Blue")}
            {renderField("Clarity", "clarity", "text", "", CLARITY_OPTIONS)}
            {renderField("Cut", "cut", "text", "", CUT_OPTIONS)}
            {renderField("Treatment", "treatment", "text", "", TREATMENT_OPTIONS)}
          </div>
        </div>

        {/* Certification */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-5">Certification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Certificate Number", "certificate_number", "text", "e.g. GIA-1234567")}
            {renderField("Certifying Laboratory", "certificate_lab", "text", "", LAB_OPTIONS)}
          </div>

          {/* Certification on Request toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.certificate_lab === 'On Request'}
                onChange={e => {
                  if (e.target.checked) {
                    setField('certificate_lab', 'On Request');
                    setField('certificate_number', '');
                  } else {
                    setField('certificate_lab', 'None');
                  }
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gem-800 text-yellow-500 focus:ring-yellow-500/30"
              />
              <span className="text-sm text-gray-300">Certification available on request</span>
            </label>
            <p className="text-xs text-gray-600 mt-1 ml-7">Select this if the stone can be certified but hasn't been yet.</p>
          </div>

          {/* Certificate Images */}
          {mode === 'edit' && id && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid #1f2d45' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" /> Certificate Images
                </h3>
                <button type="button" onClick={() => certInputRef.current?.click()} disabled={uploadingCert}
                  className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />
                  {uploadingCert ? 'Uploading…' : 'Add Certificate'}
                </button>
              </div>
              <input ref={certInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleCertUpload} />
              {certificates.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-3">No certificate images uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {certificates.map(c => (
                    <div key={c.id} className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer" style={{ border: '1px solid #1f2d45' }}
                      onClick={() => window.open(c.url, '_blank')}>
                      <img src={c.url} alt="Certificate" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1">
                        <button type="button" onClick={e => { e.stopPropagation(); deleteCertificate(c); }}
                          className="p-1.5 rounded bg-red-500/80 text-white hover:bg-red-600" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-2">Cost Breakdown</h2>
          <p className="text-xs text-gray-500 mb-5">All costs are internal only and never shown to buyers.</p>

          <div className="mb-5">
            <label className="label-text">State of Stone When Purchased</label>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => setField('stone_state', 'rough')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.stone_state === 'rough' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-400 border border-gem-border hover:border-gray-500'}`}>
                Rough
              </button>
              <button type="button" onClick={() => setField('stone_state', 'cut_polished')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.stone_state === 'cut_polished' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-400 border border-gem-border hover:border-gray-500'}`}>
                Cut & Polished
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="label-text">Currency</label>
            <select value={form.purchase_currency} onChange={e => setField('purchase_currency', e.target.value)}
              className="input-field text-sm w-48">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="LKR">LKR (Rs)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="CHF">CHF (Fr)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="HKD">HKD (HK$)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="THB">THB (฿)</option>
            </select>
          </div>

          {(() => {
            const cur = form.purchase_currency || 'USD';
            const sym = ({ USD: '$', EUR: '€', GBP: '£', LKR: 'Rs', AUD: 'A$', CHF: 'Fr', JPY: '¥', HKD: 'HK$', SGD: 'S$', THB: '฿' } as Record<string,string>)[cur] || cur;

            const costInput = (label: string, field: keyof FormValues, hint?: string) => (
              <div>
                <label className="label-text">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{sym}</span>
                  <input type="number" value={form[field]} onChange={e => setField(field, e.target.value)}
                    placeholder="0.00" className="input-field pl-7" step="0.01" min="0" />
                </div>
                {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
              </div>
            );

            const costFields = form.stone_state === 'rough'
              ? [form.rough_stone_price, form.preforming_cost, form.cutting_polishing_cost, form.treatment_cost, form.certification_cost, form.other_costs]
              : [form.buying_price, form.treatment_cost, form.certification_cost, form.other_costs];
            const totalPurchase = costFields.reduce((sum, v) => sum + (v ? parseFloat(v) || 0 : 0), 0);

            return (
              <>
                {form.stone_state === 'rough' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {costInput('Rough Stone Price', 'rough_stone_price')}
                      <div>
                        <label className="label-text">Rough Stone Weight (ct)</label>
                        <input type="number" value={form.rough_stone_weight} onChange={e => setField('rough_stone_weight', e.target.value)}
                          placeholder="e.g. 12.5" className="input-field" step="0.01" min="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {costInput('Preforming Cost', 'preforming_cost')}
                      {costInput('Cut & Polish Cost', 'cutting_polishing_cost')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {costInput('Treatment Cost', 'treatment_cost')}
                      {costInput('Certification Cost', 'certification_cost')}
                      {costInput('Other Costs', 'other_costs', 'Transport, packaging, etc.')}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {costInput('Stone Buying Price', 'buying_price')}
                      {costInput('Treatment Cost', 'treatment_cost')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {costInput('Certification Cost', 'certification_cost')}
                      {costInput('Other Costs', 'other_costs', 'Transport, packaging, etc.')}
                    </div>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-gem-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Total Purchase Cost</span>
                    <span className="text-lg font-bold text-yellow-400">
                      {sym}{totalPurchase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Convert to</span>
                      <select value={convertCurrency} onChange={e => setConvertCurrency(e.target.value)}
                        className="text-xs rounded-md px-2 py-1 border border-gem-border bg-gem-700 text-gray-100 focus:border-yellow-500/50 focus:outline-none">
                        <option value="">—</option>
                        {['USD','EUR','GBP','LKR','AUD','CHF','JPY','HKD','SGD','THB'].filter(c => c !== cur).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {convertCurrency && totalPurchase > 0 && exchangeRates[convertCurrency] && (
                      <span className="text-sm font-semibold text-gray-300">
                        ≈ {({ USD: '$', EUR: '€', GBP: '£', LKR: 'Rs', AUD: 'A$', CHF: 'Fr', JPY: '¥', HKD: 'HK$', SGD: 'S$', THB: '฿' } as Record<string,string>)[convertCurrency] || convertCurrency}
                        {(totalPurchase * exchangeRates[convertCurrency]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Receipts & Bills */}
          {mode === 'edit' && id && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid #1f2d45' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-yellow-400" /> Receipts &amp; Bills
                </h3>
                <button type="button" onClick={() => receiptInputRef.current?.click()} disabled={uploadingReceipt}
                  className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />
                  {uploadingReceipt ? 'Uploading…' : 'Add Receipt'}
                </button>
              </div>
              <input ref={receiptInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleReceiptUpload} />
              {receipts.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-3">No receipts uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {receipts.map(r => (
                    <div key={r.id} className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer" style={{ border: '1px solid #1f2d45' }}
                      onClick={() => window.open(r.url, '_blank')}>
                      <img src={r.url} alt="Receipt" className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1">
                        <button type="button" onClick={e => { e.stopPropagation(); deleteReceipt(r); }}
                          className="p-1.5 rounded bg-red-500/80 text-white hover:bg-red-600" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selling & Buyer Price */}
        {(() => {
          const costFields2 = form.stone_state === 'rough'
            ? [form.rough_stone_price, form.preforming_cost, form.cutting_polishing_cost, form.treatment_cost, form.certification_cost, form.other_costs]
            : [form.buying_price, form.treatment_cost, form.certification_cost, form.other_costs];
          const totalCost = costFields2.reduce((sum, v) => sum + (v ? parseFloat(v) || 0 : 0), 0);

          const marginInfo = (priceStr: string) => {
            const price = priceStr ? parseFloat(priceStr) : 0;
            if (!price || !totalCost) return null;
            const profit = price - totalCost;
            const pct = Math.round((profit / totalCost) * 100);
            return { profit, pct };
          };

          const CURRENCIES = [
            { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' },
            { value: 'GBP', label: 'GBP (£)' }, { value: 'LKR', label: 'LKR (Rs)' },
            { value: 'AUD', label: 'AUD (A$)' }, { value: 'CHF', label: 'CHF (Fr)' },
            { value: 'JPY', label: 'JPY (¥)' }, { value: 'HKD', label: 'HKD (HK$)' },
            { value: 'SGD', label: 'SGD (S$)' }, { value: 'THB', label: 'THB (฿)' },
          ];
          const SYM: Record<string,string> = { USD: '$', EUR: '€', GBP: '£', LKR: 'Rs', AUD: 'A$', CHF: 'Fr', JPY: '¥', HKD: 'HK$', SGD: 'S$', THB: '฿' };

          const priceField = (label: string, field: keyof FormValues, currField: keyof FormValues, hint: string, hintColor: string) => {
            const cur = form[currField] || 'USD';
            const sym = SYM[cur] || cur;
            const margin = marginInfo(form[field]);
            return (
              <div>
                <label className="label-text">{label}</label>
                <select value={cur} onChange={e => setField(currField, e.target.value)}
                  className="input-field text-sm py-1 mb-1">
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{sym}</span>
                  <input type="number" value={form[field]} onChange={e => setField(field, e.target.value)}
                    placeholder="0.00" className="input-field pl-7" step="0.01" min="0" />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${hintColor} inline-block`} />
                    {hint}
                  </p>
                  {margin && (
                    <p className={`text-xs font-medium ${margin.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {margin.profit >= 0 ? '+' : ''}{sym}{margin.profit.toLocaleString()} ({margin.pct}%)
                    </p>
                  )}
                </div>
              </div>
            );
          };

          return (
            <div className="gem-card p-6">
              <h2 className="font-display text-lg font-semibold text-gray-200 mb-2">Selling Prices</h2>
              <p className="text-xs text-gray-500 mb-5">Profit margins are calculated against total purchase cost{totalCost ? ` (${SYM[form.purchase_currency] || '$'}${totalCost.toLocaleString()})` : ''}.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {priceField('Min. Selling Price', 'selling_price', 'selling_currency', 'Internal only', 'bg-red-500')}
                {priceField('Buyer Price', 'buyer_price', 'buyer_currency', 'Shown to buyers', 'bg-emerald-500')}
                {priceField('Price Sold', 'sold_price', 'sold_currency', 'Final sale price', 'bg-blue-500')}
              </div>
            </div>
          );
        })()}

        {/* Notes */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-5">Notes</h2>
          <div className="space-y-4">
            <div>
              <label className="label-text">Internal Notes</label>
              <p className="text-xs text-gray-600 mb-1.5">Never shown to buyers</p>
              <textarea value={form.internal_notes} onChange={e => setField('internal_notes', e.target.value)}
                rows={6} placeholder="Internal observations, provenance notes, purchase history…"
                className="input-field" />
            </div>
            <div>
              <label className="label-text">Buyer Notes</label>
              <p className="text-xs text-gray-600 mb-1.5">Shown on buyer share pages</p>
              <textarea value={form.buyer_notes} onChange={e => setField('buyer_notes', e.target.value)}
                rows={8} placeholder="Description for potential buyers…"
                className="input-field" />
            </div>
          </div>
        </div>

        {/* Provenance & History — edit mode only */}
        {mode === 'edit' && id && (
          <div className="gem-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" /> Provenance &amp; History
              </h2>
              <button type="button" onClick={() => setShowHistoryForm(!showHistoryForm)}
                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                {showHistoryForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showHistoryForm ? 'Cancel' : 'Add Event'}
              </button>
            </div>

            {showHistoryForm && (
              <div className="mb-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: '#0f1520', border: '1px solid #1f2d45' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Event Type *</label>
                    <input type="text" value={historyForm.event_type} onChange={e => setHistoryForm(f => ({ ...f, event_type: e.target.value }))} placeholder="e.g. Rough purchased" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                    <input type="date" value={historyForm.event_date} onChange={e => setHistoryForm(f => ({ ...f, event_date: e.target.value }))} className="input-field text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                    <input type="text" value={historyForm.location} onChange={e => setHistoryForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Ratnapura, Sri Lanka" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Performed By</label>
                    <input type="text" value={historyForm.performed_by} onChange={e => setHistoryForm(f => ({ ...f, performed_by: e.target.value }))} placeholder="e.g. A. Silva" className="input-field text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                  <input type="text" value={historyForm.notes} onChange={e => setHistoryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." className="input-field text-sm" />
                </div>
                <button type="button" onClick={addHistoryEntry} disabled={!historyForm.event_type || savingHistory} className="btn-primary text-sm w-full disabled:opacity-40">
                  {savingHistory ? 'Saving…' : 'Add to Timeline'}
                </button>
              </div>
            )}

            {history.length === 0 && !showHistoryForm ? (
              <p className="text-sm text-gray-600 text-center py-4">No history recorded yet. Click "Add Event" to start tracking.</p>
            ) : (
              <div className="relative ml-3">
                {history.length > 0 && <div className="absolute left-0 top-2 bottom-2 w-px bg-yellow-400/20" />}
                <div className="space-y-0">
                  {history.map(entry => (
                    <div key={entry.id} className="relative pl-6 pb-4 group">
                      <div className="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-yellow-400 ring-2 ring-gem-900" />
                      {editingHistoryId === entry.id ? (
                        <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: '#0f1520', border: '1px solid #1f2d45' }}>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Event Type *</label>
                              <input type="text" value={editHistoryForm.event_type} onChange={e => setEditHistoryForm(f => ({ ...f, event_type: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                              <input type="date" value={editHistoryForm.event_date} onChange={e => setEditHistoryForm(f => ({ ...f, event_date: e.target.value }))} className="input-field text-sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Location</label>
                              <input type="text" value={editHistoryForm.location} onChange={e => setEditHistoryForm(f => ({ ...f, location: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Performed By</label>
                              <input type="text" value={editHistoryForm.performed_by} onChange={e => setEditHistoryForm(f => ({ ...f, performed_by: e.target.value }))} className="input-field text-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Notes</label>
                            <input type="text" value={editHistoryForm.notes} onChange={e => setEditHistoryForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={saveEditHistory} disabled={!editHistoryForm.event_type || savingHistory} className="btn-primary text-sm flex-1 disabled:opacity-40">
                              {savingHistory ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" onClick={() => setEditingHistoryId(null)} className="text-sm px-3 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 transition-colors" style={{ border: '1px solid #1f2d45' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-200">{entry.event_type}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {entry.event_date && (
                                <span className="text-xs text-gray-500">
                                  {new Date(entry.event_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {entry.location && <span className="text-xs text-gray-500">📍 {entry.location}</span>}
                              {entry.performed_by && <span className="text-xs text-gray-500">👤 {entry.performed_by}</span>}
                            </div>
                            {entry.notes && <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => startEditHistory(entry)} className="p-1 text-gray-600 hover:text-yellow-400" title="Edit entry">
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => deleteHistoryEntry(entry.id)} className="p-1 text-gray-600 hover:text-red-400" title="Delete entry">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media */}
        <div className="gem-card p-6">
          <h2 className="font-display text-lg font-semibold text-gray-200 mb-5 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-yellow-400" /> Media
          </h2>

          {/* Existing media */}
          {existingMedia.length > 0 && (
            <div className="mb-4">
              <p className="label-text mb-2">Current Photos</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {existingMedia.map((media, index) => (
                  <div key={media.id} className="relative group aspect-square rounded-lg overflow-hidden"
                    style={{ border: media.is_primary ? '2px solid #c9a84c' : '1px solid #1f2d45' }}>
                    {media.media_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#0f1520' }}>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-0 h-0 ml-0.5 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0}
                          className="p-1 rounded bg-blue-400/20 text-blue-300 hover:bg-blue-400/40 disabled:opacity-30 disabled:cursor-not-allowed" title="Move left">
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === existingMedia.length - 1}
                          className="p-1 rounded bg-blue-400/20 text-blue-300 hover:bg-blue-400/40 disabled:opacity-30 disabled:cursor-not-allowed" title="Move right">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {!media.is_primary && (
                          <button type="button" onClick={() => setPrimaryMedia(media.id)}
                            className="p-1 rounded bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/40" title="Set as primary">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeExistingMedia(media)}
                          className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {media.is_primary && (
                      <div className="absolute top-1 left-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 text-[10px] font-mono text-white bg-black/60 px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 hover:border-yellow-600"
            style={{ borderColor: '#1f2d45', backgroundColor: '#0a0e18' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0f1520')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0a0e18')}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-sm font-medium">Click to upload photos</p>
            <p className="text-gray-600 text-xs mt-1">JPG, PNG, WebP, MP4 · Max 20MB each</p>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {/* Pending uploads */}
          {uploads.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {uploads.map((u, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid #1f2d45' }}>
                  {u.file.type.startsWith('video') ? (
                    <div className="w-full h-full flex items-center justify-center bg-gem-700">
                      <span className="text-xs text-gray-400">VIDEO</span>
                    </div>
                  ) : (
                    <img src={u.preview} alt="" className="w-full h-full object-cover" />
                  )}
                  {u.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  {!u.uploading && !u.savedMedia && (
                    <button type="button" onClick={() => removeUpload(i)}
                      className="absolute top-1 right-1 p-0.5 rounded bg-red-500/80 text-white hover:bg-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {u.savedMedia && (
                    <div className="absolute top-1 right-1 p-0.5 rounded bg-emerald-500/80">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg text-sm text-red-400"
            style={{ backgroundColor: 'rgba(127,29,29,0.3)', border: '1px solid rgba(185,28,28,0.4)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-4 rounded-lg text-sm text-emerald-400"
            style={{ backgroundColor: 'rgba(6,78,59,0.3)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8 py-3">
            {saving ? <LoadingSpinner size="sm" /> : null}
            {saving ? 'Saving…' : mode === 'add' ? 'Add to Archive' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
