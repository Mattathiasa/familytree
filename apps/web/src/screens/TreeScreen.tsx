import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { canAddPeople, claimedPerson, family as familyApi, livingStatusOf, livingTally, personLabel } from '../api/client';
import type { PersonDto, RelationshipDto } from '../api/types';
import { useApp } from '../app/store';
import { Button, EmptyState, Input, Modal, useToast } from '@ft/ui';
import { kinshipLabel, type FamilyDate, type GraphEdge } from '@ft/domain';
import {
  layoutTree, treePersonLabel, treePersonLifespan,
  type LayoutResult, type PositionedEdge, type TreeEdge, type TreePerson,
} from '../tree/layout';
import './tree.css';

/* three.js and drei are heavy and only this view needs them. */
const TreeConstellation3D = lazy(() =>
  import('./TreeConstellation3D').then((m) => ({ default: m.TreeConstellation3D })),
);

interface Transform { x: number; y: number; k: number }

/* Living status is derived, never stored (resolveLiving in @ft/domain): an
   asserted flag, then a death date, then a 110-year window. 'unknown' is a
   real answer and must not be presented as 'ancestor'. */
const LIVING_GLYPH = { living: '●', deceased: '✦', unknown: '·' } as const;
const LIVING_TITLE = {
  living: 'Living relative (protected)',
  deceased: 'Ancestor',
  unknown: 'Living status not recorded',
} as const;

const MIN_K = 0.35;
const MAX_K = 2.5;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function TreeScreen() {
  const { familyId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user, roleFor } = useApp();
  const role = roleFor(familyId);
  const [params] = useSearchParams();

  const [people, setPeople] = useState<PersonDto[] | null>(null);
  const [rels, setRels] = useState<RelationshipDto[] | null>(null);
  const [direction, setDirection] = useState<'descendant' | 'ancestor'>('descendant');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('focus'));
  const [query, setQuery] = useState('');
  const reducedMotion = usePrefersReducedMotion();
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'list'>(() => {
    const requested = params.get('view');
    // Dashboard, People and PersonProfile all link here with ?view=3d. An
    // animated canvas is not what someone asking for reduced motion wants
    // arriving unbidden from a link, so the URL cannot opt them in — the view
    // switcher still can, because that is their own deliberate choice.
    if (requested === '3d') return reducedMotion ? '2d' : '3d';
    if (requested === 'list' || requested === '2d') return requested;
    return '2d';
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'ancestor'>('all');
  const [addTarget, setAddTarget] = useState<{ person: PersonDto; rel: 'parent' | 'child' | 'spouse' } | null>(null);

  /* Adding a relative creates a new person, so the question is whether this
     role may add people at all — not whether it may edit some notional
     family-visible record it happens to author. The old check passed
     isAuthor: true, which is simply untrue for a person who does not exist yet
     and would wave a contributor through on records they do not own. */
  const canWrite = !!user && canAddPeople(role);
  const meId = claimedPerson(people ?? [], user)?.id ?? null;

  useEffect(() => {
    let alive = true;
    familyApi.tree(familyId!).then((t) => {
      if (!alive) return;
      setPeople(t.nodes);
      setRels(t.edges);
    }).catch(() => alive && setPeople([]));
    return () => { alive = false; };
  }, [familyId]);

  const livingCounts = useMemo(() => livingTally(people ?? []), [people]);

  const treePeople: TreePerson[] = useMemo(
    () => (people ?? []).map((p) => ({
      id: p.id, givenName: p.givenName, middleName: p.middleName, familyName: p.familyName,
      nickname: p.nickname, birthDate: p.birthDate, deathDate: p.deathDate,
      photoUrl: p.photoUrl, gender: p.gender,
    })),
    [people],
  );
  const treeEdges: TreeEdge[] = useMemo(
    () => (rels ?? []).map((r) => ({ id: r.id, from: r.fromPersonId, to: r.toPersonId, kind: r.kind })),
    [rels],
  );

  const layout: LayoutResult | null = useMemo(() => {
    if (!people || !rels) return null;
    if (people.length === 0) return null;
    const root = selectedId ?? people[0]!.id;
    return layoutTree(root, treePeople, treeEdges, { direction });
  }, [people, rels, treePeople, treeEdges, direction, selectedId]);

  if (people === null || rels === null) {
    return (
      <div className="tree-wrap" aria-busy="true">
        <div className="tree-skeleton" />
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <EmptyState
        icon="🌳"
        title="Your family story starts here."
        body="Add your first family member and begin building your family tree. One person is enough to start."
        action={<Link to={`/f/${familyId}/people/new`} className="ft-btn ft-btn--primary">Add a family member</Link>}
      />
    );
  }

  return (
    <div className="tree-screen">
      {/* Top Controls Toolbar */}
      <div className="tree-toolbar glass-panel">
        <Input
          type="search"
          className="tree-search"
          placeholder="Search family to highlight…"
          aria-label="Search the tree — matching people are highlighted and others dimmed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* View Mode Segmented Controls */}
        <div className="tree-view-switcher" role="tablist" aria-label="Tree view modes">
          <button
            type="button"
            className={`view-switch-btn ${viewMode === '2d' ? 'is-active' : ''}`}
            onClick={() => setViewMode('2d')}
            role="tab"
            aria-selected={viewMode === '2d'}
          >
            🌳 2D Blueprint
          </button>
          <button
            type="button"
            className={`view-switch-btn ${viewMode === '3d' ? 'is-active' : ''}`}
            onClick={() => setViewMode('3d')}
            role="tab"
            aria-selected={viewMode === '3d'}
          >
            ✨ 3D Constellation
          </button>
          <button
            type="button"
            className={`view-switch-btn ${viewMode === 'list' ? 'is-active' : ''}`}
            onClick={() => setViewMode('list')}
            role="tab"
            aria-selected={viewMode === 'list'}
          >
            ☰ List
          </button>
        </div>

        {/* Generational Status Filter */}
        <div className="tree-status-filter" role="radiogroup" aria-label="Filter relatives">
          <button
            type="button"
            className={`status-filter-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({people.length})
          </button>
          <button
            type="button"
            className={`status-filter-chip ${statusFilter === 'living' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('living')}
          >
            <span className="dot-living" /> Living ({livingCounts.living})
          </button>
          <button
            type="button"
            className={`status-filter-chip ${statusFilter === 'ancestor' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('ancestor')}
          >
            <span className="dot-ancestor">✦</span> Ancestors ({livingCounts.deceased})
          </button>
        </div>

        {viewMode === '2d' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDirection(direction === 'descendant' ? 'ancestor' : 'descendant')}
            aria-label={`Layout: ${direction}. Switch to ${direction === 'descendant' ? 'ancestor' : 'descendant'} view`}
          >
            {direction === 'descendant' ? 'Descendants ↓' : 'Ancestors ↑'}
          </Button>
        )}
      </div>

      {/* Main View Area */}
      {viewMode === 'list' ? (
        <TreeListFallback
          people={people}
          edges={treeEdges}
          familyId={familyId!}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpen={(id) => nav(`/f/${familyId}/people/${id}`)}
        />
      ) : viewMode === '3d' ? (
        <Suspense fallback={<div className="page-loading" aria-busy="true" aria-label="Loading the constellation view" />}>
          <TreeConstellation3D
            people={people}
            rels={rels}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            onOpen={(id) => nav(`/f/${familyId}/people/${id}`)}
          />
        </Suspense>
      ) : (
        <TreeCanvas
          layout={layout!}
          people={people}
          query={query}
          statusFilter={statusFilter}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onOpen={(id) => nav(`/f/${familyId}/people/${id}`)}
          onAdd={(person, rel) => {
            if (!canWrite) { toast.push('Viewers can\'t add people. Ask a family admin for a contributor role.', 'danger'); return; }
            setAddTarget({ person, rel });
          }}
          onFit={() => {}}
        />
      )}

      {selectedId && viewMode !== 'list' && (
        <SelectionPopover
          familyId={familyId!}
          person={people.find((p) => p.id === selectedId) ?? null}
          meId={meId}
          edges={treeEdges}
          onClose={() => setSelectedId(null)}
          onOpen={() => nav(`/f/${familyId}/people/${selectedId}`)}
          onAdd={(rel) => {
            const person = people.find((p) => p.id === selectedId);
            if (person) {
              if (!canWrite) { toast.push('Viewers can\'t add people. Ask a family admin for a contributor role.', 'danger'); return; }
              setAddTarget({ person, rel });
            }
          }}
          canWrite={canWrite}
        />
      )}

      <AddRelativeModal
        familyId={familyId!}
        target={addTarget}
        onClose={() => setAddTarget(null)}
        onDone={(id) => {
          setAddTarget(null);
          setSelectedId(id);
          // refresh
          familyApi.tree(familyId!).then((t) => { setPeople(t.nodes); setRels(t.edges); });
        }}
      />

      <p className="tree-hint muted small">
        Drag to pan · scroll to zoom · click a person for actions · Tab into the tree and use arrow keys.
        {selectedId && people.find((p) => p.id === selectedId) && (
          <> Selected: <strong>{personLabel(people.find((p) => p.id === selectedId)!)}</strong></>
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

function TreeCanvas({
  layout, people, query, statusFilter, selectedId, onSelect, onOpen, onAdd,
}: {
  layout: LayoutResult;
  people: PersonDto[];
  query: string;
  statusFilter: 'all' | 'living' | 'ancestor';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  onAdd: (person: PersonDto, rel: 'parent' | 'child' | 'spouse') => void;
  onFit: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>({ x: 40, y: 40, k: 1 });
  const drag = useRef<{ px: number; py: number; tx: number; ty: number } | null>(null);
  const [focusedViaKeyboard, setFocusedViaKeyboard] = useState(false);

  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { width, height } = wrap.getBoundingClientRect();
    const k = Math.min(width / (layout.width + 80), height / (layout.height + 80), 1.4);
    setT({
      k: Math.max(MIN_K, k),
      x: (width - layout.width * k) / 2,
      y: (height - layout.height * k) / 2,
    });
  }, [layout]);

  useEffect(() => { fit(); }, [fit]);

  const clampT = (next: Transform): Transform => {
    const wrap = wrapRef.current;
    const w = wrap?.clientWidth ?? 800;
    const h = wrap?.clientHeight ?? 600;
    return {
      k: next.k,
      x: Math.min(60, Math.max(w - layout.width * next.k - 60, next.x)),
      y: Math.min(60, Math.max(h - layout.height * next.k - 60, next.y)),
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0016);
    const k = Math.min(MAX_K, Math.max(MIN_K, t.k * factor));
    setT(clampT({
      k,
      x: mx - ((mx - t.x) * k) / t.k,
      y: my - ((my - t.y) * k) / t.k,
    }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { px: e.clientX, py: e.clientY, tx: t.x, ty: t.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setT(clampT({ k: t.k, x: drag.current.tx + (e.clientX - drag.current.px), y: drag.current.ty + (e.clientY - drag.current.py) }));
  };
  const onPointerUp = () => { drag.current = null; };

  // Keyboard traversal over visible nodes, ordered by row then x.
  const order = useMemo(
    () => [...layout.nodes].sort((a, b) => a.y - b.y || a.x - b.x).map((n) => n.person.id),
    [layout],
  );
  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = selectedId ? order.indexOf(selectedId) : -1;
    const move = (next: number) => {
      if (next < 0 || next >= order.length) return;
      e.preventDefault();
      const id = order[next]!;
      onSelect(id);
      document.getElementById(`tnode-${id}`)?.focus();
    };
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': move(cur + 1); break;
      case 'ArrowLeft': case 'ArrowUp': move(cur - 1); break;
      case 'Home': move(0); break;
      case 'End': move(order.length - 1); break;
      case 'Enter': if (selectedId) { e.preventDefault(); onOpen(selectedId); } break;
      case 'Escape': onSelect(null); break;
      case '+': case '=': setT((v) => clampT({ ...v, k: Math.min(MAX_K, v.k * 1.2) })); break;
      case '-': setT((v) => clampT({ ...v, k: Math.max(MIN_K, v.k / 1.2) })); break;
      case '0': fit(); break;
    }
  };

  const needle = query.trim().toLowerCase();
  const matches = (p: TreePerson): boolean =>
    needle.length > 0 &&
    `${p.givenName ?? ''} ${p.familyName ?? ''} ${p.nickname ?? ''}`.toLowerCase().includes(needle);

  const W = 168, H = 64;
  const showToolbarZoom = true;

  return (
    <div className="tree-wrap" ref={wrapRef}>
      <div className="tree-zoombar" role="group" aria-label="Zoom controls">
        <button className="ft-icon-btn" aria-label="Zoom in" onClick={() => setT((v) => clampT({ ...v, k: Math.min(MAX_K, v.k * 1.25) }))}>＋</button>
        <button className="ft-icon-btn" aria-label="Zoom out" onClick={() => setT((v) => clampT({ ...v, k: Math.max(MIN_K, v.k / 1.25) }))}>－</button>
        <button className="ft-icon-btn" aria-label="Fit tree to screen" onClick={fit}>⤢</button>
        <button className="ft-icon-btn" aria-label="Centre on selection" onClick={() => {
          const sel = layout.byPersonId.get(selectedId ?? '');
          if (!sel || !wrapRef.current) return;
          const { width, height } = wrapRef.current.getBoundingClientRect();
          setT(clampT({ k: t.k, x: width / 2 - sel.x * t.k, y: height / 2 - sel.y * t.k }));
        }}>◎</button>
      </div>

      <div
        ref={canvasRef}
        className={`tree-canvas ${focusedViaKeyboard ? 'tree-canvas--focus' : ''}`}
        style={{
          transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})`,
          width: layout.width,
          height: layout.height,
          transition: reduced || drag.current ? 'none' : 'transform 120ms cubic-bezier(0.2,0.7,0.3,1)',
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onKeyDown={onKeyDown}
        onFocus={() => setFocusedViaKeyboard(true)}
        onBlur={() => setFocusedViaKeyboard(false)}
        tabIndex={0}
        role="tree"
        aria-label="Family tree"
        aria-activedescendant={selectedId ? `tnode-${selectedId}` : undefined}
      >
        <svg className="tree-edges" width={layout.width} height={layout.height} aria-hidden="true">
          {layout.edges.map((e) => {
            const highlight = matchesEdge(e, layout, needle);
            const dim = needle.length > 0 && !highlight;
            if (e.kind === 'spouse') {
              return (
                <line
                  key={e.id}
                  x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                  className={`tree-edge-spouse ${highlight ? 'tree-edge--hi' : ''}`}
                  opacity={dim ? 0.15 : 1}
                />
              );
            }
            const midY = (e.y1 + e.y2) / 2;
            const d = `M ${e.x1} ${e.y1 + H / 2 - 6} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2 - H / 2 + 6}`;
            return (
              <path
                key={e.id} d={d}
                className={`tree-edge ${highlight ? 'tree-edge--hi' : ''}`}
                opacity={dim ? 0.15 : 1}
              />
            );
          })}
        </svg>

        {layout.nodes.map((n) => {
          const p = people.find((x) => x.id === n.person.id)!;
          const isMatch = matches(n.person);
          const matchesFilter =
            statusFilter === 'all' ||
            (statusFilter === 'living' && livingStatusOf(p) === 'living') ||
            (statusFilter === 'ancestor' && livingStatusOf(p) === 'deceased');
          const dim = (needle.length > 0 && !isMatch) || !matchesFilter;
          const selected = selectedId === n.person.id;
          const initials = treePersonLabel(n.person).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
          return (
            <button
              key={n.person.id}
              id={`tnode-${n.person.id}`}
              className={`tree-node ${selected ? 'tree-node--selected' : ''} ${isMatch ? 'tree-node--match' : ''}`}
              style={{
                left: n.x - W / 2, top: n.y - H / 2, width: W, height: H,
                opacity: dim ? 'var(--tree-dim-opacity)' : 1,
              }}
              role="treeitem"
              aria-level={n.generation + 1}
              aria-selected={selected}
              aria-label={`${treePersonLabel(n.person)}, generation ${n.generation + 1}${treePersonLifespan(n.person) ? `, ${treePersonLifespan(n.person)}` : ''}`}
              onClick={(ev) => { ev.stopPropagation(); onSelect(n.person.id); }}
              onDoubleClick={(ev) => { ev.stopPropagation(); onOpen(n.person.id); }}
            >
              {p.photoUrl
                ? <img src={p.photoUrl} alt="" className="tree-node-photo" />
                : <span className="tree-node-avatar" aria-hidden="true">{initials}</span>}
              <span className="tree-node-text">
                <span className="tree-node-header-row">
                  <span className="tree-node-name">{treePersonLabel(n.person)}</span>
                  <span
                    className={`node-status-indicator is-${livingStatusOf(p)}`}
                    title={LIVING_TITLE[livingStatusOf(p)]}
                  >
                    {LIVING_GLYPH[livingStatusOf(p)]}
                  </span>
                </span>
                <span className="tree-node-years">{treePersonLifespan(n.person)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="visually-hidden" aria-live="polite">
        {selectedId && people.find((p) => p.id === selectedId)
          ? `Selected ${personLabel(people.find((p) => p.id === selectedId)!)}`
          : ''}
      </div>
      {showToolbarZoom && null}
    </div>
  );
}

function matchesEdge(e: PositionedEdge, layout: LayoutResult, needle: string): boolean {
  if (!needle) return false;
  const a = layout.byPersonId.get(e.from)?.person;
  const b = layout.byPersonId.get(e.to)?.person;
  const hay = (p?: TreePerson) => p ? `${p.givenName ?? ''} ${p.familyName ?? ''} ${p.nickname ?? ''}`.toLowerCase().includes(needle) : false;
  return hay(a) || hay(b);
}

/* ------------------------------------------------------------------ */
/* Selection popover                                                   */
/* ------------------------------------------------------------------ */

function SelectionPopover({
  familyId, person, meId, edges, onClose, onOpen, onAdd, canWrite,
}: {
  familyId: string;
  person: PersonDto | null;
  /** The person record the signed-in account has claimed, or null. */
  meId: string | null;
  edges: TreeEdge[];
  onClose: () => void;
  onOpen: () => void;
  onAdd: (rel: 'parent' | 'child' | 'spouse') => void;
  canWrite: boolean;
}) {
  if (!person) return null;
  /* Kinship is relative to *you*, which needs a person record you have
     claimed (spec §23). This used to read people[0] — an arbitrary array
     element, usually a great-grandparent — so the label was a plausible-looking
     fiction. With no claimed profile there is no "you", and no label. */
  const kin = meId && meId !== person.id
    ? kinshipLabel(edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind })) as GraphEdge[], meId, person.id)
    : null;
  void familyId;
  return (
    <div className="tree-popover" role="dialog" aria-label={`${personLabel(person)} — quick actions`}>
      <div className="tree-popover-head">
        <strong>{personLabel(person)}</strong>
        <button className="ft-icon-btn" style={{ minHeight: 32, minWidth: 32 }} aria-label="Close actions" onClick={onClose}>✕</button>
      </div>
      <div className="tree-popover-years muted small">
        {treePersonLifespan(person) || 'Dates unknown'}
        {kin ? ` · ${kin}` : ''}
      </div>
      <div className="tree-popover-actions">
        <Button size="sm" variant="secondary" onClick={onOpen}>Open profile</Button>
        {canWrite && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onAdd('parent')}>Add parent</Button>
            <Button size="sm" variant="ghost" onClick={() => onAdd('child')}>Add child</Button>
            <Button size="sm" variant="ghost" onClick={() => onAdd('spouse')}>Add spouse</Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add relative modal (creates person + edge in one go)                */
/* ------------------------------------------------------------------ */

function AddRelativeModal({
  familyId, target, onClose, onDone,
}: {
  familyId: string;
  target: { person: PersonDto; rel: 'parent' | 'child' | 'spouse' } | null;
  onClose: () => void;
  onDone: (newId: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<FamilyDate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(''); setBirthDate(null); setError(null); }, [target]);

  if (!target) return null;
  const { person, rel } = target;
  const title = rel === 'parent' ? 'Add a parent' : rel === 'child' ? 'Add a child' : 'Add a spouse';

  async function save() {
    if (!name.trim()) { setError('A name is required.'); return; }
    setBusy(true);
    setError(null);
    try {
      const { people, relationships } = await import('../api/client');
      const created = await people.create(familyId, {
        givenName: name.trim(),
        birthDate,
        familyName: rel !== 'spouse' ? person.familyName ?? '' : '',
      });
      const edge = rel === 'parent'
        ? { fromPersonId: created.id, toPersonId: person.id, kind: 'parent' as const }
        : rel === 'child'
          ? { fromPersonId: person.id, toPersonId: created.id, kind: 'parent' as const }
          : { fromPersonId: person.id, toPersonId: created.id, kind: 'spouse' as const };
      await relationships.create(familyId, edge);
      toast.push(`${name.trim()} connected.`, 'success');
      onDone(created.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <p className="muted small">Connecting to <strong>{personLabel(person)}</strong>.</p>
      <div className="ft-field">
        <label className="ft-label" htmlFor="rel-name">Name</label>
        <input id="rel-name" className="ft-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <DateFieldLite value={birthDate} onChange={setBirthDate} />
      {error && <div role="alert" className="ft-alert ft-alert--danger">{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={busy} onClick={save}>Add and connect</Button>
      </div>
    </Modal>
  );
}

/* Minimal inline date capture for the modal (full DateField exists for the form). */
function DateFieldLite({ value, onChange }: { value: FamilyDate | null; onChange: (d: FamilyDate | null) => void }) {
  const prec = value?.precision ?? 'unknown';
  return (
    <div className="ft-field">
      <span className="ft-label">Birth (optional)</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="ft-input ft-select" style={{ width: 'auto' }}
          aria-label="Birth precision"
          value={prec}
          onChange={(e) => {
            const p = e.target.value as FamilyDate['precision'];
            if (p === 'unknown') onChange(null);
            else onChange({ calendar: 'gregorian', precision: p, year: value?.year });
          }}
        >
          <option value="unknown">Unknown</option>
          <option value="year">Year only</option>
          <option value="circa">Circa</option>
        </select>
        {prec !== 'unknown' && (
          <input
            className="ft-input" style={{ width: 110 }} type="number" min={1} max={3000}
            aria-label="Birth year" placeholder="Year"
            value={value?.year ?? ''}
            onChange={(e) => onChange({ calendar: 'gregorian', precision: prec, year: e.target.value ? Number(e.target.value) : undefined })}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accessible list fallback (no-canvas path, UI_UX.md §3.2)            */
/* ------------------------------------------------------------------ */

function TreeListFallback({
  people, edges, familyId, selectedId, onSelect, onOpen,
}: {
  people: PersonDto[];
  edges: TreeEdge[];
  familyId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== 'parent') continue;
    (parentsOf.get(e.to) ?? parentsOf.set(e.to, []).get(e.to)!).push(e.from);
  }
  const roots = people.filter((p) => !(parentsOf.get(p.id)?.length));
  const rows: Array<{ person: PersonDto; depth: number }> = [];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const p = byId.get(id);
    if (p) rows.push({ person: p, depth });
    const childEdges = edges.filter((e) => e.kind === 'parent' && e.from === id);
    for (const ce of childEdges) walk(ce.to, depth + 1);
  };
  for (const r of roots) walk(r.id, 0);
  for (const p of people) if (!seen.has(p.id)) rows.push({ person: p, depth: 0 });

  return (
    <div className="tree-list" role="tree" aria-label="Family tree (list view)">
      {rows.map(({ person, depth }) => {
        const years = treePersonLifespan({
          id: person.id, givenName: person.givenName, familyName: person.familyName,
          nickname: person.nickname, birthDate: person.birthDate, deathDate: person.deathDate,
        });
        return (
          <div
            key={person.id}
            role="treeitem"
            aria-level={depth + 1}
            aria-selected={selectedId === person.id}
            tabIndex={0}
            className={`tree-list-row ${selectedId === person.id ? 'tree-list-row--sel' : ''}`}
            style={{ paddingInlineStart: depth * 28 + 12 }}
            onFocus={() => onSelect(person.id)}
            onClick={() => onSelect(person.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(person.id); }}
          >
            <span className="tree-list-name">{personLabel(person)}</span>
            {years && <span className="muted small">{years}</span>}
            <Link className="ft-btn ft-btn--ghost ft-btn--sm" to={`/f/${familyId}/people/${person.id}`}>Open</Link>
          </div>
        );
      })}
    </div>
  );
}
