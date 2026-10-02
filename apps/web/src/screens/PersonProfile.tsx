import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { family as familyApi, personLabel } from '../api/client';
import type { ChangeRecordDto, MemoryDto, PersonDto, RelativeGroups, StoryDto } from '../api/types';
import { Avatar, Badge, Button, Card, Modal, Skeleton, useToast } from '@ft/ui';
import { convertYear, formatFamilyDate, lifespan, resolveLiving } from '@ft/domain';

function LifeLineDual({ p }: { p: PersonDto }) {
  const b = p.birthDate;
  const d = p.deathDate;
  if (!b && !d) return <span className="muted">Dates unrecorded</span>;

  const bConverted = b ? convertYear(b) : null;
  const dConverted = d ? convertYear(d) : null;

  const bTxt = b ? formatFamilyDate(b) : null;
  const dTxt = d ? formatFamilyDate(d) : null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {bTxt && b && (
        <span>
          b. {bTxt}
          {bConverted && (
            <span style={{ opacity: 0.7, fontSize: '0.88em', marginLeft: 4 }}>
              ({b.calendar === 'ethiopic' ? `${bConverted} GC` : `${bConverted} EC`})
            </span>
          )}
        </span>
      )}
      {bTxt && dTxt && <span style={{ opacity: 0.5 }}>—</span>}
      {dTxt && d && (
        <span>
          d. {dTxt}
          {dConverted && (
            <span style={{ opacity: 0.7, fontSize: '0.88em', marginLeft: 4 }}>
              ({d.calendar === 'ethiopic' ? `${dConverted} GC` : `${dConverted} EC`})
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function PersonProfile() {
  const { familyId, personId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [p, setP] = useState<PersonDto | null>(null);
  const [rel, setRel] = useState<RelativeGroups | null>(null);
  const [history, setHistory] = useState<ChangeRecordDto[] | null>(null);
  const [memories, setMemories] = useState<MemoryDto[] | null>(null);
  const [stories, setStories] = useState<StoryDto[] | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'history'>('overview');
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Audio player state for oral histories
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      import('../api/client').then(({ people }) => people.get(familyId!, personId!)),
      familyApi.relatives(familyId!, personId!),
      import('../api/client').then(({ people }) => people.history(familyId!, personId!)),
      familyApi.memories(familyId!).catch(() => [] as MemoryDto[]),
      familyApi.stories(familyId!).catch(() => [] as StoryDto[]),
    ])
      .then(([person, relatives, hist, mems, stors]) => {
        if (!alive) return;
        setP(person);
        setRel(relatives);
        setHistory(hist);
        setMemories(mems.filter((m) => m.personIds.includes(personId!)));
        setStories(stors.filter((s) => s.personIds.includes(personId!)));
      })
      .catch(() => alive && setNotFound(true));
    return () => { alive = false; };
  }, [familyId, personId]);

  async function removePerson() {
    const { people } = await import('../api/client');
    await people.remove(familyId!, personId!);
    toast.push('Person removed.', 'success');
    nav(`/f/${familyId}/people`);
  }

  function toggleAudio(url?: string) {
    if (!url) return;
    if (activeAudio === url && audioPlaying) {
      setAudioPlaying(false);
    } else {
      setActiveAudio(url);
      setAudioPlaying(true);
    }
  }

  if (notFound) {
    return (
      <Card>
        <h1>We couldn't find this person</h1>
        <p className="muted">They may have been removed, or the link is out of date.</p>
        <Link to={`/f/${familyId}/people`} className="ft-btn ft-btn--secondary">Back to people</Link>
      </Card>
    );
  }

  if (!p || !rel) {
    return (
      <div style={{ display: 'grid', gap: 'var(--space-3)' }} aria-busy="true">
        <div style={{ height: 160, borderRadius: 'var(--radius-xl)' }}><Skeleton /></div>
        <div style={{ height: 300, borderRadius: 'var(--radius-lg)' }}><Skeleton /></div>
      </div>
    );
  }

  const isAlive = resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null) === 'living';
  const name = personLabel(p);
  const memoryCount = (memories?.length ?? 0) + (stories?.length ?? 0);

  return (
    <div className="profile">
      {/* Luxury Profile Hero */}
      <div className="profile-hero">
        <div className="profile-hero-content">
          <div className="profile-hero-avatar">
            <Avatar name={name} src={p.photoUrl} size={92} />
          </div>

          <div className="profile-hero-meta">
            <div className="eyebrow" style={{ color: 'var(--color-accent)' }}>
              {isAlive ? 'Living Torchbearer · የዛሬ ትውልድ' : 'Honored Ancestor · የተከበሩ አያት'}
            </div>
            <h1 className="profile-hero-name">{name}</h1>

            <div className="profile-hero-lifeline">
              <LifeLineDual p={p} />
              {p.birthPlace && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-faint)' }}>
                  · 📍 {p.birthPlace}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge tone={isAlive ? 'success' : 'neutral'}>
                {isAlive ? '● Living' : '✦ Ancestor'}
              </Badge>
              {p.nickname && <Badge tone="accent">“{p.nickname}”</Badge>}
              {p.occupation && <Badge tone="neutral">{p.occupation}</Badge>}
              {p.birthDate?.calendar === 'ethiopic' && <Badge tone="neutral">Ethiopic Calendar</Badge>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
            <Link to={`/f/${familyId}/tree?view=3d&focus=${p.id}`} className="ft-btn ft-btn--ghost" title="Locate in 3D Kinship Constellation">
              ✨ 3D Constellation
            </Link>
            <Link to={`/f/${familyId}/tree?focus=${p.id}`} className="ft-btn ft-btn--secondary" title="View in 2D Tree">
              🌳 View in Tree
            </Link>
            <Link to={`/f/${familyId}/people/${p.id}/edit`} className="ft-btn ft-btn--secondary">
              Edit
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`profile-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview & Kinship
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'memories'}
          className={`profile-tab-btn ${activeTab === 'memories' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('memories')}
        >
          Stories & Memories ({memoryCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`profile-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Provenance & Edits ({history?.length ?? 0})
        </button>
      </div>

      {/* Tab 1: Overview & Kinship */}
      {activeTab === 'overview' && (
        <div className="two-col profile-body">
          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <Card>
              <div className="panel-title">Biography & Journey</div>
              {p.biography ? (
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 'var(--text-base)' }}>{p.biography}</p>
              ) : (
                <p className="muted">
                  No biography recorded yet.{' '}
                  <Link to={`/f/${familyId}/people/${p.id}/edit`}>Add one</Link> — every lineage begins with a story.
                </p>
              )}
              <dl className="facts">
                {p.birthPlace && (
                  <>
                    <dt>Birth Place</dt>
                    <dd>{p.birthPlace}</dd>
                  </>
                )}
                {p.deathPlace && (
                  <>
                    <dt>Resting Place</dt>
                    <dd>{p.deathPlace}</dd>
                  </>
                )}
                {p.occupation && (
                  <>
                    <dt>Vocation / Work</dt>
                    <dd>{p.occupation}</dd>
                  </>
                )}
                <dt>Preferred Calendar</dt>
                <dd>{p.birthDate?.calendar === 'ethiopic' ? 'Ethiopian Solar (ዓመተ ምሕረት)' : 'Gregorian'}</dd>
              </dl>
            </Card>

            {/* Quick Media Preview if memories exist */}
            {memories && memories.length > 0 && (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div className="panel-title" style={{ margin: 0 }}>Archived Memories ({memories.length})</div>
                  <button type="button" className="ft-btn ft-btn--ghost" style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }} onClick={() => setActiveTab('memories')}>
                    View all →
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
                  {memories.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setActiveTab('memories')}
                    >
                      {m.type === 'photo' && m.url ? (
                        <img src={m.url} alt={m.title} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: 90, display: 'grid', placeItems: 'center', background: 'var(--color-accent-soft)', fontSize: '1.8rem' }}>
                          {m.type === 'audio' ? '🎙️' : '📜'}
                        </div>
                      )}
                      <div style={{ padding: '6px 8px', fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.title}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
            <Card>
              <div className="panel-title">Direct Lineage & Kinship</div>
              <RelRow label={rel.parents.length === 1 ? 'Parent' : 'Parents'}>
                {rel.parents.map(({ person, nature }) => (
                  <FamilyChip key={person.id} familyId={familyId!} person={person} sub={nature !== 'biological' ? nature : undefined} />
                ))}
                {rel.parents.length === 0 && (
                  <span className="muted small">
                    None recorded. <Link to={`/f/${familyId}/people/${p.id}/edit?add=parent`}>Add a parent</Link>
                  </span>
                )}
              </RelRow>

              <RelRow label={rel.spouses.length === 1 ? 'Spouse' : 'Spouses'}>
                {rel.spouses.map(({ person, marriedDate }) => (
                  <FamilyChip key={person.id} familyId={familyId!} person={person} sub={marriedDate ? `m. ${formatFamilyDate(marriedDate)}` : undefined} />
                ))}
                {rel.spouses.length === 0 && <span className="muted small">None recorded.</span>}
              </RelRow>

              <RelRow label={rel.children.length === 1 ? 'Child' : 'Children'}>
                {rel.children.map(({ person }) => (
                  <FamilyChip key={person.id} familyId={familyId!} person={person} />
                ))}
                {rel.children.length === 0 && <span className="muted small">None recorded.</span>}
              </RelRow>

              <RelRow label={rel.siblings.length === 1 ? 'Sibling' : 'Siblings'}>
                {rel.siblings.map(({ person }) => (
                  <FamilyChip key={person.id} familyId={familyId!} person={person} />
                ))}
                {rel.siblings.length === 0 && (
                  <span className="muted small">Siblings appear when parents are shared.</span>
                )}
              </RelRow>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Stories & Memories */}
      {activeTab === 'memories' && (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {memoryCount === 0 ? (
            <Card style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🎙️</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 8px' }}>No stories or memories tagged to {name} yet</h3>
              <p className="muted" style={{ maxWidth: 480, margin: '0 auto var(--space-4)' }}>
                Preserve their voice, oral sayings, vintage photographs, or write down a memorable story from their life.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Link to={`/f/${familyId}/memories`} className="ft-btn ft-btn--primary">
                  + Add to Family Vault
                </Link>
                <Link to={`/f/${familyId}/stories`} className="ft-btn ft-btn--secondary">
                  Write a Story
                </Link>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
              {/* Memories (Photos & Audio) */}
              {memories?.map((m) => (
                <Card key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {m.type === 'photo' && m.url && (
                    <div style={{ height: 180, overflow: 'hidden', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', margin: 'calc(-1 * var(--space-4)) calc(-1 * var(--space-4)) var(--space-3)' }}>
                      <img src={m.url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Badge tone={m.type === 'audio' ? 'accent' : 'neutral'}>
                      {m.type === 'audio' ? '🎙️ Oral History' : m.type === 'photo' ? '📷 Photograph' : '📜 Document'}
                    </Badge>
                    <span className="muted small">{m.dateLabel ?? m.createdAt.slice(0, 10)}</span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{m.title}</h3>
                  <p className="muted small" style={{ marginBottom: 'var(--space-3)', flex: 1 }}>{m.description}</p>

                  {m.type === 'audio' && (
                    <div className="story-audio-banner" style={{ marginTop: 'auto' }}>
                      <button
                        type="button"
                        className="ft-icon-btn"
                        style={{ background: 'var(--color-accent)', color: '#fff', width: 34, height: 34, minWidth: 34, minHeight: 34 }}
                        onClick={() => toggleAudio(m.url)}
                        aria-label={audioPlaying && activeAudio === m.url ? 'Pause audio' : 'Play oral history'}
                      >
                        {audioPlaying && activeAudio === m.url ? '⏸' : '▶'}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{m.description.slice(0, 40) || name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{m.audioDuration ?? '1:24'} · Recorded Oral History</div>
                      </div>
                      {audioPlaying && activeAudio === m.url && (
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <span style={{ width: 3, height: 14, background: 'var(--color-accent)', animation: 'pulse 0.8s infinite' }} />
                          <span style={{ width: 3, height: 20, background: 'var(--color-accent)', animation: 'pulse 1s infinite' }} />
                          <span style={{ width: 3, height: 12, background: 'var(--color-accent)', animation: 'pulse 0.6s infinite' }} />
                        </div>
                      )}
                    </div>
                  )}

                  {m.location && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 6 }}>
                      📍 {m.location}
                    </div>
                  )}
                </Card>
              ))}

              {/* Written Stories */}
              {stories?.map((s) => (
                <Card key={s.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Badge tone="accent">📖 Story</Badge>
                    <span className="muted small">{s.periodLabel}</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{s.title}</h3>
                  <p className="muted small" style={{ marginBottom: 'var(--space-3)', flex: 1, lineHeight: 1.6 }}>
                    {s.body.length > 180 ? `${s.body.slice(0, 180)}…` : s.body}
                  </p>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                    Written by {s.authorName}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Provenance & History */}
      {activeTab === 'history' && (
        <Card>
          <div className="panel-title">Provenance & Modification Trail</div>
          <p className="muted small" style={{ marginBottom: 'var(--space-4)' }}>
            Every fact in the ancestral record is timestamped with the editor's signature to ensure authenticity.
          </p>
          {!history || history.length === 0 ? (
            <p className="muted small">No recorded changes yet.</p>
          ) : (
            <ul className="list-tight">
              {history.map((h) => (
                <li key={h.id}>
                  <strong>{h.actorName}</strong> changed {h.label.toLowerCase()}:{' '}
                  <span className="muted">{h.oldValue} → {h.newValue}</span>
                  <span className="muted small"> · {new Date(h.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Removal Confirmation Modal */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Remove ${name}?`}>
        <p>
          This removes <strong>{name}</strong> and their relationship links from the current tree.
          In the full build, removal is reversible for 30 days.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
          <Button variant="danger" onClick={removePerson}>Remove person</Button>
        </div>
      </Modal>
    </div>
  );
}

function RelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rel-row">
      <div className="rel-label">{label}</div>
      <div className="rel-chips">{children}</div>
    </div>
  );
}

function FamilyChip({ familyId, person, sub }: { familyId: string; person: PersonDto; sub?: string }) {
  const name = personLabel(person);
  const years = lifespan(person.birthDate, person.deathDate);
  return (
    <Link to={`/f/${familyId}/people/${person.id}`} className="family-chip" title={name}>
      <Avatar name={name} src={person.photoUrl} size={32} />
      <span>
        <span className="family-chip-name">{name}</span>
        {sub ? <span className="family-chip-sub">{sub}</span> : years ? <span className="family-chip-sub">{years}</span> : null}
      </span>
    </Link>
  );
}
