import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { family as familyApi, personLabel } from '../api/client';
import type { MemoryDto, PersonDto } from '../api/types';
import { useApp } from '../app/store';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Skeleton, Textarea, useToast } from '@ft/ui';

export function Memories() {
  const { familyId } = useParams();
  const { roleFor } = useApp();
  const role = roleFor(familyId);
  const toast = useToast();
  const canWrite = role === 'owner' || role === 'admin' || role === 'contributor';

  const [memories, setMemories] = useState<MemoryDto[] | null>(null);
  const [people, setPeople] = useState<PersonDto[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'audio' | 'document'>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [lightboxMemory, setLightboxMemory] = useState<MemoryDto | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      familyApi.memories(familyId!),
      familyApi.tree(familyId!).then((t) => t.nodes),
    ]).then(([mems, folks]) => {
      if (!alive) return;
      setMemories(mems);
      setPeople(folks);
    });
    return () => { alive = false; };
  }, [familyId]);

  const filtered = useMemo(() => {
    if (!memories) return null;
    return memories.filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false;
      if (filterPerson !== 'all' && !m.personIds.includes(filterPerson)) return false;
      return true;
    });
  }, [memories, filterType, filterPerson]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this memory?')) return;
    await familyApi.deleteMemory(familyId!, id);
    setMemories((prev) => (prev ?? []).filter((m) => m.id !== id));
    if (lightboxMemory?.id === id) setLightboxMemory(null);
    toast.push('Memory removed.', 'success');
  }

  return (
    <div className="memories-screen">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow text-gradient-gold">✦ Living Vault</div>
          <h1 className="page-title font-display">Family Memories & Vault</h1>
          <p className="sub">Preserve authentic photographs, oral recordings, and sacred family documents.</p>
        </div>
        {canWrite && (
          <Button onClick={() => setAddModalOpen(true)}>
            + Add Memory
          </Button>
        )}
      </div>

      {/* Controls & Filter Bar */}
      <div className="memories-controls glass-panel" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px 18px', borderRadius: '16px', marginBottom: '24px' }}>
        <div className="segmented-tabs" style={{ display: 'inline-flex', background: 'var(--color-surface-sunken)', padding: '3px', borderRadius: '999px', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={`tab-btn ${filterType === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterType('all')}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: filterType === 'all' ? 'var(--color-surface-raised)' : 'transparent', color: filterType === 'all' ? 'var(--color-brand)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            All Vault ({memories?.length ?? 0})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'photo' ? 'is-active' : ''}`}
            onClick={() => setFilterType('photo')}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: filterType === 'photo' ? 'var(--color-surface-raised)' : 'transparent', color: filterType === 'photo' ? 'var(--color-brand)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            📷 Photos ({memories?.filter((m) => m.type === 'photo').length ?? 0})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'audio' ? 'is-active' : ''}`}
            onClick={() => setFilterType('audio')}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: filterType === 'audio' ? 'var(--color-surface-raised)' : 'transparent', color: filterType === 'audio' ? 'var(--color-brand)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            🎙️ Oral Recordings ({memories?.filter((m) => m.type === 'audio').length ?? 0})
          </button>
          <button
            type="button"
            className={`tab-btn ${filterType === 'document' ? 'is-active' : ''}`}
            onClick={() => setFilterType('document')}
            style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: filterType === 'document' ? 'var(--color-surface-raised)' : 'transparent', color: filterType === 'document' ? 'var(--color-brand)' : 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            📜 Documents ({memories?.filter((m) => m.type === 'document').length ?? 0})
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="filter-person" style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Relative:</label>
          <Select
            id="filter-person"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="all">Everyone in family</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {personLabel(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Grid of Memories */}
      {!filtered ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '320px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📷"
          title="No memories found"
          body="Add photographs, oral interviews, or vintage certificates to keep your family's heritage alive."
          action={canWrite ? <Button onClick={() => setAddModalOpen(true)}>Add the first memory</Button> : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filtered.map((item) => {
            const tagged = people.filter((p) => item.personIds.includes(p.id));
            const isPlaying = activeAudioId === item.id;

            return (
              <Card
                key={item.id}
                className="memory-card glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '0',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-1)',
                  transition: 'transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease)',
                }}
              >
                {/* Media Presentation */}
                {item.type === 'photo' || item.type === 'document' ? (
                  <div
                    onClick={() => setLightboxMemory(item)}
                    style={{
                      height: '200px',
                      background: '#150d09',
                      overflow: 'hidden',
                      cursor: 'zoom-in',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={item.url}
                      alt={item.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(20, 12, 8, 0.75)',
                        backdropFilter: 'blur(8px)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: item.type === 'photo' ? '#f5ad45' : '#e0743e',
                      }}
                    >
                      {item.type === 'photo' ? '📷 Photo' : '📜 Document'}
                    </span>
                    {item.dateLabel && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          background: 'rgba(20, 12, 8, 0.75)',
                          backdropFilter: 'blur(8px)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          color: '#f0e7db',
                        }}
                      >
                        {item.dateLabel}
                      </span>
                    )}
                  </div>
                ) : (
                  /* Audio Player Card Section */
                  <div
                    style={{
                      padding: '24px 20px',
                      background: 'linear-gradient(135deg, var(--color-brand-light) 0%, var(--color-gold-soft) 100%)',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveAudioId(isPlaying ? null : item.id)}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--color-brand), var(--color-gold))',
                        color: '#fff',
                        fontSize: '1.25rem',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flex: 'none',
                        boxShadow: '0 4px 14px rgba(198, 83, 34, 0.35)',
                      }}
                      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.08em' }}>
                        🎙️ ORAL RECORDING
                      </span>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {item.audioDuration ? `${item.audioDuration} mins` : 'Spoken Audio'}
                      </div>
                      {/* Animated Soundwave */}
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '16px', marginTop: '6px' }}>
                        {Array.from({ length: 18 }).map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: '3px',
                              height: isPlaying ? `${Math.sin(idx * 0.8) * 10 + 12}px` : '4px',
                              background: 'var(--color-brand)',
                              borderRadius: '2px',
                              transition: 'height 0.2s ease',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Details */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 6px', color: 'var(--color-text)' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: '1.5', margin: '0 0 14px', flex: 1 }}>
                    {item.description}
                  </p>

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-faint)', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                    <span>📍 {item.location ?? 'Ethiopia'}</span>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Tagged Family Members */}
                  {tagged.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                      {tagged.map((person) => (
                        <Link
                          key={person.id}
                          to={`/f/${familyId}/people/${person.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--color-surface-sunken)',
                            color: 'var(--color-text)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            textDecoration: 'none',
                          }}
                        >
                          <span>👤</span>
                          <span>{personLabel(person)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxMemory && (
        <Modal
          open={lightboxMemory !== null}
          onClose={() => setLightboxMemory(null)}
          title={lightboxMemory.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <img
              src={lightboxMemory.url}
              alt={lightboxMemory.title}
              style={{
                width: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '12px',
                background: '#0a0604',
              }}
            />
            <p style={{ color: 'var(--color-text)', lineHeight: '1.5' }}>
              {lightboxMemory.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              <span>📍 {lightboxMemory.location ?? 'Unknown location'}</span>
              <span>📅 {lightboxMemory.dateLabel ?? 'Date unrecorded'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Memory Modal */}
      <AddMemoryModal
        familyId={familyId!}
        people={people}
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={(newMem) => {
          setMemories((prev) => [newMem, ...(prev ?? [])]);
          setAddModalOpen(false);
          toast.push('Memory added to vault.', 'success');
        }}
      />
    </div>
  );
}

function AddMemoryModal({
  familyId,
  people,
  open,
  onClose,
  onSaved,
}: {
  familyId: string;
  people: PersonDto[];
  open: boolean;
  onClose: () => void;
  onSaved: (m: MemoryDto) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'photo' | 'audio' | 'document'>('photo');
  const [url, setUrl] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [location, setLocation] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick preset samples for convenient adding
  function applyPreset(presetType: 'photo' | 'audio' | 'document') {
    setType(presetType);
    if (presetType === 'photo') {
      setTitle('Family Gathering in Addis Ababa');
      setUrl('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80');
      setDateLabel('c. 1985');
      setLocation('Addis Ababa');
    } else if (presetType === 'audio') {
      setTitle('Elder Story: Memories of the Old Market');
      setUrl('https://cdn.freesound.org/previews/512/512689_11200236-lq.mp3');
      setDateLabel('2014');
      setLocation('Gondar, Ethiopia');
    } else {
      setTitle('Ancestral Land Deed & Seal');
      setUrl('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80');
      setDateLabel('1952');
      setLocation('Shoa Province');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!url.trim()) { setError('Media URL or audio file is required'); return; }

    setBusy(true);
    setError(null);
    try {
      const saved = await familyApi.saveMemory(familyId, {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        audioDuration: type === 'audio' ? '03:15' : undefined,
        dateLabel: dateLabel.trim() || undefined,
        location: location.trim() || undefined,
        personIds: selectedPeople,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to Family Vault">
      <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="sm" variant={type === 'photo' ? 'primary' : 'secondary'} onClick={() => applyPreset('photo')}>
            📷 Photo
          </Button>
          <Button size="sm" variant={type === 'audio' ? 'primary' : 'secondary'} onClick={() => applyPreset('audio')}>
            🎙️ Audio Memory
          </Button>
          <Button size="sm" variant={type === 'document' ? 'primary' : 'secondary'} onClick={() => applyPreset('document')}>
            📜 Document
          </Button>
        </div>

        <Field label="Title" error={error && !title.trim() ? error : undefined}>
          {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wedding in Addis Ababa, 1970" />}
        </Field>

        <Field label="Description or Transcript">
          {(id) => <Textarea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The story or details behind this item…" />}
        </Field>

        <Field label="Media URL (Image or Audio file)">
          {(id) => <Input id={id} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/photo.jpg" />}
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Date / Era (e.g. c. 1970, 1998)">
            {(id) => <Input id={id} value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Circa 1970" />}
          </Field>
          <Field label="Location">
            {(id) => <Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Gondar, Ethiopia" />}
          </Field>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Tag Family Members:</label>
          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px' }}>
            {people.map((p) => {
              const checked = selectedPeople.includes(p.id);
              return (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPeople((prev) => [...prev, p.id]);
                      else setSelectedPeople((prev) => prev.filter((id) => id !== p.id));
                    }}
                  />
                  <span>{personLabel(p)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Add to Vault'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
