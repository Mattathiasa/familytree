import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { family as familyApi, personLabel } from '../api/client';
import type { PersonDto, StoryDto } from '../api/types';
import { useApp } from '../app/store';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Skeleton, Textarea, useToast } from '@ft/ui';

export function Stories() {
  const { familyId } = useParams();
  const { user, roleFor } = useApp();
  const role = roleFor(familyId);
  const toast = useToast();
  const [stories, setStories] = useState<StoryDto[] | null>(null);
  const [people, setPeople] = useState<PersonDto[]>([]);
  const [editing, setEditing] = useState<StoryDto | 'new' | null>(null);
  const [reading, setReading] = useState<StoryDto | null>(null);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<'all' | 'published' | 'drafts'>('all');

  const canWrite = role === 'owner' || role === 'admin' || role === 'contributor';

  useEffect(() => {
    let alive = true;
    Promise.all([
      familyApi.stories(familyId!),
      import('../api/client').then(({ people: api }) => api.list(familyId!)),
    ]).then(([s, p]) => {
      if (!alive) return;
      setStories(s);
      setPeople(p);
    });
    return () => { alive = false; };
  }, [familyId, editing]);

  const peopleMap = useMemo(() => {
    const map = new Map<string, PersonDto>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  async function publish(story: StoryDto) {
    await familyApi.saveStory(familyId!, { id: story.id, title: story.title, body: story.body, status: 'published' });
    toast.push('Story published.', 'success');
    setStories(await familyApi.stories(familyId!));
  }

  /* Draft isolation keys off the author's id, not their display name: two
     relatives with the same name would see each other's drafts, and renaming
     your own account would hide your drafts from you (SECURITY.md §11.5). */
  const filtered = useMemo(() => {
    if (!stories) return null;
    const q = search.trim().toLowerCase();
    return stories.filter((s) => {
      const mine = !!user && s.authorId === user.id;
      const isDraft = s.status === 'draft';
      if (isDraft && !mine) return false;

      if (activeStatus === 'published' && isDraft) return false;
      if (activeStatus === 'drafts' && !isDraft) return false;

      if (q) {
        const hay = `${s.title} ${s.body} ${s.periodLabel ?? ''} ${s.authorName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stories, search, activeStatus, user]);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">Oral Histories & Chronicles · ታሪኮች</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.5rem)', margin: '0 0 6px' }}>
            Family Chronicles
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            The journeys, traditions, memories, and wisdom behind the names.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setEditing('new')} className="ft-btn--primary">
            + Write a Story
          </Button>
        )}
      </div>

      {/* Controls Bar */}
      <div className="people-controls-bar" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input
            type="search"
            placeholder="Search stories by title, keyword, or narrator…"
            aria-label="Search stories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 3, borderRadius: 999, border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={`people-seg-btn ${activeStatus === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveStatus('all')}
          >
            All Stories
          </button>
          <button
            type="button"
            className={`people-seg-btn ${activeStatus === 'published' ? 'is-active' : ''}`}
            onClick={() => setActiveStatus('published')}
          >
            Published
          </button>
          <button
            type="button"
            className={`people-seg-btn ${activeStatus === 'drafts' ? 'is-active' : ''}`}
            onClick={() => setActiveStatus('drafts')}
          >
            Drafts
          </button>
        </div>
      </div>

      {!filtered ? (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }} aria-busy="true">
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }}><Skeleton /></div>
          <div style={{ height: 160, borderRadius: 'var(--radius-lg)' }}><Skeleton /></div>
        </div>
      ) : filtered.length === 0 ? (
        stories?.length === 0 ? (
          <EmptyState
            icon="📖"
            title="No chronicles yet"
            body="Every family has them — the journey across continents, meeting at the spring, Sunday coffee ceremonies. Start with a single sentence."
            action={canWrite ? <Button onClick={() => setEditing('new')}>Write the first chronicle</Button> : undefined}
          />
        ) : (
          <EmptyState
            icon="🔍"
            title="No matching stories"
            body="Try a different search term or clear your active filter."
            action={<Button variant="secondary" onClick={() => { setSearch(''); setActiveStatus('all'); }}>Clear search</Button>}
          />
        )
      ) : (
        <div className="stories-grid">
          {filtered.map((s) => {
            const mine = !!user && s.authorId === user.id;
            const isDraft = s.status === 'draft';
            const tagged = (s.personIds ?? []).map((id) => peopleMap.get(id)).filter(Boolean) as PersonDto[];

            return (
              <Card
                key={s.id}
                className="story-card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform var(--speed) var(--ease), box-shadow var(--speed) var(--ease), border-color var(--speed) var(--ease)',
                }}
                onClick={() => setReading(s)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Badge tone={isDraft ? 'neutral' : 'accent'}>
                    {isDraft ? 'Draft' : 'Published'}
                  </Badge>
                  {s.periodLabel && <span className="muted small">⏳ {s.periodLabel}</span>}
                </div>

                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', margin: '0 0 8px', lineHeight: 1.3 }}>
                  {s.title}
                </h3>

                <p className="muted small" style={{ marginBottom: 'var(--space-3)', flex: 1, lineHeight: 1.6 }}>
                  {s.body.length > 150 ? `${s.body.slice(0, 150)}…` : s.body}
                </p>

                {tagged.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 var(--space-3)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>Tagged:</span>
                    {tagged.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.72rem',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          padding: '2px 6px',
                          borderRadius: 999,
                        }}
                      >
                        <Avatar name={personLabel(p)} src={p.photoUrl} size={16} />
                        {personLabel(p)}
                      </span>
                    ))}
                    {tagged.length > 3 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)' }}>+{tagged.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="story-foot" onClick={(e) => e.stopPropagation()}>
                  <span className="muted small">Narrated by {s.authorName}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" onClick={() => setReading(s)}>Read →</Button>
                    {mine && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>Edit</Button>
                        {isDraft && <Button size="sm" onClick={() => publish(s)}>Publish</Button>}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Luxury Editorial Reading Modal */}
      {reading && (
        <Modal open={true} onClose={() => setReading(null)} title="">
          <div className="story-reader-hero">
            <div className="eyebrow" style={{ color: 'var(--color-accent)' }}>Family Chronicle · ትውልድ ታሪክ</div>
            <h2 className="story-reader-title">{reading.title}</h2>
            <div className="story-reader-meta">
              <span>✍️ {reading.authorName}</span>
              {reading.periodLabel && <span>· ⏳ {reading.periodLabel}</span>}
              <span>· <Badge tone={reading.status === 'draft' ? 'neutral' : 'accent'}>{reading.status}</Badge></span>
            </div>
          </div>

          <div className="story-reader-body">
            {reading.body}
          </div>

          {reading.personIds && reading.personIds.length > 0 && (
            <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
              <div className="panel-title" style={{ marginBottom: 'var(--space-2)' }}>Relatives in this chronicle</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {reading.personIds.map((id) => {
                  const p = peopleMap.get(id);
                  if (!p) return null;
                  const name = personLabel(p);
                  return (
                    <Link
                      key={id}
                      to={`/f/${familyId}/people/${id}`}
                      className="family-chip"
                      onClick={() => setReading(null)}
                    >
                      <Avatar name={name} src={p.photoUrl} size={24} />
                      <span className="family-chip-name">{name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'var(--space-5)' }}>
            {!!user && reading.authorId === user.id && (
              <Button variant="secondary" onClick={() => { const s = reading; setReading(null); setEditing(s); }}>
                Edit Story
              </Button>
            )}
            <Button onClick={() => setReading(null)}>Done Reading</Button>
          </div>
        </Modal>
      )}

      {/* Story Editor Modal */}
      <StoryEditor
        familyId={familyId!}
        story={editing === 'new' ? null : editing}
        open={editing !== null}
        people={people}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function StoryEditor({
  familyId,
  story,
  open,
  people,
  onClose,
}: {
  familyId: string;
  story: StoryDto | null;
  open: boolean;
  people: PersonDto[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(story?.title ?? '');
  const [body, setBody] = useState(story?.body ?? '');
  const [periodLabel, setPeriodLabel] = useState(story?.periodLabel ?? '');
  const [personIds, setPersonIds] = useState<string[]>(story?.personIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(story?.title ?? '');
    setBody(story?.body ?? '');
    setPeriodLabel(story?.periodLabel ?? '');
    setPersonIds(story?.personIds ?? []);
  }, [story, open]);

  async function save(status: 'draft' | 'published') {
    setBusy(true);
    setError(null);
    try {
      await familyApi.saveStory(familyId, { id: story?.id, title, body, periodLabel, personIds, status });
      toast.push(status === 'published' ? 'Story published.' : 'Draft saved.', 'success');
      onClose();
    } catch (err) {
      const ex = err as { fields?: Record<string, string>; message?: string };
      setError(ex.fields?.title ?? ex.message ?? 'We couldn\'t save this story.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={story ? 'Edit chronicle' : 'Write a family chronicle'}>
      {error && <div role="alert" className="ft-alert ft-alert--danger">{error}</div>}
      <Field label="Title">
        {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Feast of Meskel in Gondar" autoFocus />}
      </Field>
      <Field label="Time Period / Setting" hint='Free text — e.g. "c. 1958", "During the rainy season of 1974", "Harar"'>
        {(id) => <Input id={id} value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />}
      </Field>
      <Field label="The Story" hint="Write the full narrative. Paragraphs and dialogue will be formatted with literary editorial styling.">
        {(id) => <Textarea id={id} rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Begin the chronicle…" />}
      </Field>
      <Field label="Family members mentioned in this chronicle">
        {() => (
          <div className="chip-picker" role="group" aria-label="People in this story">
            {people.map((p) => {
              const on = personIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`chip-pick ${on ? 'chip-pick--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setPersonIds(on ? personIds.filter((x) => x !== p.id) : [...personIds, p.id])}
                >
                  {personLabel(p)}
                </button>
              );
            })}
          </div>
        )}
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="secondary" loading={busy} onClick={() => save('draft')}>Save draft</Button>
        <Button loading={busy} onClick={() => save('published')}>Publish Chronicle</Button>
      </div>
    </Modal>
  );
}
