import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../app/store';
import { resetDemoData, updateFamilyInDb, familyDbSetCalendar, familyDbSetPhoto, familyDbSetPrivacy, family as familyApi, people as peopleApi } from '../api/client';
import { generateGedcom } from '../api/gedcom';
import { Alert, Button, Card, Field, Input, Modal, Select, Textarea, useToast } from '@ft/ui';
import { readStored } from '../app/storage';

export function FamilySettings() {
  const { familyId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { families, refresh } = useApp();
  const fam = families.find((f) => f.id === familyId);
  const [name, setName] = useState(fam?.name ?? '');
  const [description, setDescription] = useState(fam?.description ?? '');
  const [calendar, setCalendar] = useState(fam?.lineage === 'ethiopian' ? 'ethiopic' : 'gregorian');
  const [photoUrl, setPhotoUrl] = useState(fam?.photoUrl ?? '');
  const [privacy, setPrivacy] = useState<'public' | 'family' | 'private'>(fam?.privacy ?? 'family');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Role refusal lives in the <RequireRole min="admin"> route guard (app/guards.tsx).

  async function save() {
    if (!name.trim()) { toast.push('Family name can\'t be empty.', 'danger'); return; }
    setSaving(true);
    try {
      updateFamilyInDb(familyId!, name.trim(), description.trim());
      familyDbSetCalendar(familyId!, calendar === 'ethiopic' ? 'ethiopian' : 'general');
      familyDbSetPhoto(familyId!, photoUrl.trim() || null);
      familyDbSetPrivacy(familyId!, privacy);
      toast.push('Settings saved.', 'success');
      setSaved(true);
      refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.push('Failed to save settings.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function downloadGedcom() {
    setExporting(true);
    try {
      const [peopleList, treeData] = await Promise.all([
        peopleApi.list(familyId!),
        familyApi.tree(familyId!),
      ]);
      const gedText = generateGedcom(fam?.name ?? 'family', peopleList, treeData.edges);
      const blob = new Blob([gedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fam?.name || 'family').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-lineage.ged`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push('GEDCOM 5.5 export downloaded.', 'success');
    } catch {
      toast.push('Failed to generate GEDCOM export.', 'danger');
    } finally {
      setExporting(false);
    }
  }

  function downloadJson() {
    const raw = readStored('ft.mock.db.v1');
    const blob = new Blob([raw ?? '{}'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fam?.name || 'family').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-archive.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.push('Complete JSON archive downloaded.', 'success');
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Family Configuration · አስተዳደር</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.5rem)', margin: '0 0 6px' }}>
            Family Settings
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            Lineage details, solar calendar defaults, privacy controls, and universal data portability.
          </p>
        </div>
      </div>

      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div className="panel-title">Details & Calendar</div>
        <Field label="Family name">
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Description">
          {(id) => <Textarea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <Field label="Default calendar system" hint="Dates you enter default to this calendar. Ethiopian dates are stored in Ethiopian years (ዓመተ ምሕረት) — conversion happens automatically for display.">
          {(id) => (
            <Select id={id} value={calendar} onChange={(e) => setCalendar(e.target.value)}>
              <option value="gregorian">Gregorian (Standard GC)</option>
              <option value="ethiopic">Ethiopian Solar Calendar (ዓመተ ምሕረት EC)</option>
            </Select>
          )}
        </Field>
        <Field label="Family photo URL" hint="Paste a link to an image (Unsplash, etc.). In production this becomes a file uploader.">
          {(id) => <Input id={id} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />}
        </Field>
        <Field label="Privacy" hint="Who can view this family's tree and records.">
          {(id) => (
            <Select id={id} value={privacy} onChange={(e) => setPrivacy(e.target.value as 'public' | 'family' | 'private')}>
              <option value="private">Private — only invited members</option>
              <option value="family">Family — descendants can request access</option>
              <option value="public">Public — visible to anyone with the link</option>
            </Select>
          )}
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={save} loading={saving} disabled={saving}>
            {saved ? 'Saved ✓' : 'Save settings'}
          </Button>
        </div>
      </Card>

      {/* Universal Data Portability & GEDCOM */}
      <Card style={{ marginBottom: 'var(--space-5)' }}>
        <div className="panel-title">Data Sovereignty & Universal Export</div>
        <p className="muted small" style={{ lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
          Your family's heritage belongs to your family forever. You can export your lineage at any time in universal, open formats without vendor lock-in.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>
              📜 GEDCOM 5.5.1 (.ged)
            </div>
            <p className="muted small" style={{ margin: '0 0 var(--space-3)', fontSize: '0.78rem' }}>
              Universal genealogical standard compatible with Ancestry, MyHeritage, FamilySearch, Gramps, and RootsMagic.
            </p>
            <Button size="sm" variant="secondary" loading={exporting} onClick={downloadGedcom}>
              Export GEDCOM (.ged)
            </Button>
          </div>

          <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>
              📦 Complete Vault (.json)
            </div>
            <p className="muted small" style={{ margin: '0 0 var(--space-3)', fontSize: '0.78rem' }}>
              Full raw archive of all records, relationship links, oral chronicles, and edit audit trails.
            </p>
            <Button size="sm" variant="ghost" onClick={downloadJson}>
              Export JSON Archive
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card style={{ borderColor: 'var(--color-danger)' }}>
        <div className="panel-title" style={{ color: 'var(--color-danger)' }}>Danger zone</div>
        <p className="muted small" style={{ marginBottom: 'var(--space-3)' }}>
          In the full build, deleting a family is soft — everything is recoverable for 30 days by the owner.
          This demo resets the seeded data instead.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete family…</Button>
          <Button variant="secondary" onClick={() => { resetDemoData(); toast.push('Demo data reset to the seeded family.', 'success'); refresh(); }}>
            Reset demo data
          </Button>
        </div>
      </Card>

      <Modal open={confirmDelete} onClose={() => { setConfirmDelete(false); setConfirmText(''); }} title="Delete this family?">
        <Alert tone="danger">
          This is <strong>{fam?.name}</strong>. Everyone loses access, and the record is removed.
          This cannot be undone in the demo.
        </Alert>
        <Field label={`Type the family name to confirm: ${fam?.name ?? ''}`}>
          {(id) => <Input id={id} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />}
        </Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => { setConfirmDelete(false); setConfirmText(''); }}>Cancel</Button>
          <Button
            variant="danger"
            disabled={confirmText !== fam?.name}
            onClick={() => { setConfirmDelete(false); setConfirmText(''); toast.push('Family deletion is disabled in the demo.', 'danger'); nav(`/f/${familyId}`); }}
          >
            Delete family
          </Button>
        </div>
      </Modal>
    </div>
  );
}
