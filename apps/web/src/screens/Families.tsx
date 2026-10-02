import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../app/store';
import { familyDbCreate } from '../api/client';
import { Button, Card, Field, Input, Modal, Select, Textarea, useToast } from '@ft/ui';
import type { FamilyLineage } from '../api/types';

export function Families() {
  const { user, families, refresh } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lineage, setLineage] = useState<FamilyLineage>('ethiopian');
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!name.trim()) { setError('Give your family a name — you can change it later.'); return; }
    const id = `fam-${Date.now().toString(36)}`;
    familyDbCreate(name.trim(), description.trim(), id, lineage);
    toast.push(`"${name.trim()}" created. Add your first person next.`, 'success');
    setCreating(false);
    setName('');
    setDescription('');
    setLineage('ethiopian');
    setError(null);
    refresh();
    nav(`/f/${id}`);
  }

  return (
    <div>
      <div className="hero-header">
        <div className="eyebrow" style={{ color: 'var(--color-accent)' }}>Lineage Archives · ቤተሰብ</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.6rem)', margin: '0 0 8px' }}>
          Ancestral Archives
        </h1>
        <p className="sub" style={{ margin: '0 0 var(--space-4)' }}>
          Welcome, {user?.displayName}. Enter an ancestral sanctuary, or establish a new family lineage.
        </p>
        <Button onClick={() => setCreating(true)} className="ft-btn--primary">+ Establish a Family Record</Button>
      </div>

      {families.length === 0 ? (
        <Card>
          <h2>No family yet</h2>
          <p className="muted">Create your family to start adding people, stories, and photos.</p>
          <Button onClick={() => setCreating(true)}>Create your family</Button>
        </Card>
      ) : (
        <div className="family-grid">
          {families.map((f) => (
            <Card key={f.id} className="family-card">
              <div className={`family-cover grad-${f.coverGradient ?? 0}`} aria-hidden="true" />
              <h2 style={{ marginBottom: 4 }}>{f.name}</h2>
              <p className="muted small" style={{ minHeight: 40 }}>{f.description || 'No description yet.'}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="ft-badge ft-badge--accent">{f.role}</span>
                <Link to={`/f/${f.id}`} className="ft-btn ft-btn--secondary ft-btn--sm">Open</Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create your family">
        <Field label="Family name" hint='For example "The Abebe Family".' error={error ?? undefined}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
        </Field>
        <Field label="Lineage type" hint="Choose Ethiopian for Ge'ez calendar & kinship terms, or General for standard Gregorian tracking.">
          {(id) => (
            <Select id={id} value={lineage} onChange={(e) => setLineage(e.target.value as FamilyLineage)}>
              <option value="ethiopian">Ethiopian (Ge'ez calendar, Amharic kinship)</option>
              <option value="general">General (Gregorian, standard kinship)</option>
            </Select>
          )}
        </Field>
        <Field label="Description" hint="Optional — a line about who you are.">
          {(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
        </Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          <Button onClick={create}>Create family</Button>
        </div>
      </Modal>
    </div>
  );
}
