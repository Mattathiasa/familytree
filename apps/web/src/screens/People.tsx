import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { personLabel } from '../api/client';
import type { PersonDto } from '../api/types';
import { Avatar, Badge, Button, EmptyState, Input, Select, Skeleton } from '@ft/ui';
import { convertYear, displayName, formatFamilyDate, lifespan, resolveLiving } from '@ft/domain';

export function People() {
  const { familyId } = useParams();
  const [people, setPeople] = useState<PersonDto[] | null>(null);
  const [q, setQ] = useState('');
  const [living, setLiving] = useState<'all' | 'living' | 'deceased'>('all');
  const [sort, setSort] = useState<'name' | 'birth-asc' | 'birth-desc'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    let alive = true;
    import('../api/client').then(({ people: api }) =>
      api.list(familyId!).then((p) => alive && setPeople(p)),
    );
    return () => { alive = false; };
  }, [familyId]);

  // Overall counts for stats strip
  const counts = useMemo(() => {
    if (!people) return { total: 0, living: 0, ancestors: 0 };
    let livingCount = 0;
    let ancestorCount = 0;
    for (const p of people) {
      const st = resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null);
      if (st === 'living') livingCount++;
      else ancestorCount++;
    }
    return { total: people.length, living: livingCount, ancestors: ancestorCount };
  }, [people]);

  const filtered = useMemo(() => {
    if (!people) return null;
    const needle = q.trim().toLowerCase();
    let out = people.filter((p) => {
      if (needle) {
        const hay = `${p.givenName} ${p.middleName ?? ''} ${p.familyName ?? ''} ${p.nickname ?? ''} ${p.birthPlace ?? ''} ${p.deathPlace ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (living !== 'all') {
        const st = resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null);
        if (st !== living) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === 'birth-asc') {
        const ay = a.birthDate?.year ?? 9999;
        const by = b.birthDate?.year ?? 9999;
        if (ay !== by) return ay - by;
      } else if (sort === 'birth-desc') {
        const ay = a.birthDate?.year ?? -9999;
        const by = b.birthDate?.year ?? -9999;
        if (ay !== by) return by - ay;
      }
      return displayName(a).localeCompare(displayName(b));
    });
    return out;
  }, [people, q, living, sort]);

  const searching = q.trim().length > 0 || living !== 'all';

  return (
    <div>
      <div className="page-head people-header">
        <div>
          <div className="eyebrow">Ancestral Registry · የትውልድ መዝገብ</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 1.8rem + 1vw, 2.5rem)', margin: '0 0 6px' }}>
            People & Kinfolk
          </h1>
          <p className="sub" style={{ margin: 0 }}>
            Living torchbearers and honored ancestors across generations.
          </p>

          <div className="people-stats-strip">
            <span className="people-stat-chip">
              <strong>{counts.total}</strong> Total
            </span>
            <span className="people-stat-chip">
              <span className="dot-live" aria-hidden="true" />
              <strong>{counts.living}</strong> Living
            </span>
            <span className="people-stat-chip">
              <span className="star-anc" aria-hidden="true">✦</span>
              <strong>{counts.ancestors}</strong> Ancestors
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link to={`/f/${familyId}/tree?view=3d`} className="ft-btn ft-btn--ghost" title="Explore in 3D Kinship Constellation">
            ✨ 3D Constellation
          </Link>
          <Link to={`/f/${familyId}/tree`} className="ft-btn ft-btn--secondary" title="View 2D Blueprint Tree">
            🌳 View Tree
          </Link>
          <Link to={`/f/${familyId}/people/new`} className="ft-btn ft-btn--primary">
            + Add a person
          </Link>
        </div>
      </div>

      <div className="people-controls-bar" role="search">
        <div className="people-search-group">
          <Input
            type="search"
            placeholder="Search by name, nickname, or place…"
            aria-label="Search people by name or birthplace"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="people-filter-group">
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-surface)', padding: 3, borderRadius: 999, border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className={`people-seg-btn ${living === 'all' ? 'is-active' : ''}`}
              onClick={() => setLiving('all')}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              className={`people-seg-btn ${living === 'living' ? 'is-active' : ''}`}
              onClick={() => setLiving('living')}
            >
              Living ({counts.living})
            </button>
            <button
              type="button"
              className={`people-seg-btn ${living === 'deceased' ? 'is-active' : ''}`}
              onClick={() => setLiving('deceased')}
            >
              Ancestors ({counts.ancestors})
            </button>
          </div>

          <Select aria-label="Sort people" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="name">Sort by name (A-Z)</option>
            <option value="birth-asc">Birth year (Oldest first)</option>
            <option value="birth-desc">Birth year (Youngest first)</option>
          </Select>

          <div style={{ display: 'flex', gap: 2, background: 'var(--color-surface)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className={`ft-icon-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, background: viewMode === 'grid' ? 'var(--color-accent-soft)' : 'none', color: viewMode === 'grid' ? 'var(--color-accent-strong)' : 'var(--color-text-muted)' }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              className={`ft-icon-btn ${viewMode === 'table' ? 'is-active' : ''}`}
              style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, background: viewMode === 'table' ? 'var(--color-accent-soft)' : 'none', color: viewMode === 'table' ? 'var(--color-accent-strong)' : 'var(--color-text-muted)' }}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {!filtered ? (
        <div className="people-grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="person-card-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        people!.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No people yet"
            body="Add your first family member. A name is the only thing required — everything else can come later."
            action={<Link to={`/f/${familyId}/people/new`} className="ft-btn ft-btn--primary">Add a family member</Link>}
          />
        ) : (
          <EmptyState
            icon="🔍"
            title="No matches found"
            body="Try a different spelling or clear the active filter."
            action={<Button variant="secondary" onClick={() => { setQ(''); setLiving('all'); }}>Clear filters</Button>}
          />
        )
      ) : viewMode === 'grid' ? (
        <ul className="people-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {filtered.map((p) => {
            const isAlive = resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null) === 'living';
            const name = personLabel(p);
            const span = lifespan(p.birthDate, p.deathDate);
            const converted = p.birthDate ? convertYear(p.birthDate) : null;

            return (
              <li key={p.id}>
                <div className="person-luxury-card">
                  <div className="person-luxury-top">
                    <div className={`person-avatar-wrap ${isAlive ? 'is-living' : 'is-ancestor'}`}>
                      <Avatar name={name} src={p.photoUrl} size={48} />
                    </div>

                    <div className="person-card-info">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <Link to={`/f/${familyId}/people/${p.id}`} className="person-card-name-link">
                          {name}
                        </Link>
                        <Badge tone={isAlive ? 'success' : 'neutral'}>
                          {isAlive ? 'Living' : 'Ancestor'}
                        </Badge>
                      </div>

                      {p.nickname && <div className="person-card-nickname">“{p.nickname}”</div>}

                      <div className="person-card-dates">
                        {p.birthDate ? (
                          <>
                            {formatFamilyDate(p.birthDate)}
                            {converted && (
                              <span style={{ opacity: 0.75, fontSize: '0.9em', marginLeft: 4 }}>
                                ({p.birthDate.calendar === 'ethiopic' ? `${converted} GC` : `${converted} EC`})
                              </span>
                            )}
                            {span && !span.includes(String(p.birthDate.year)) ? ` · ${span}` : ''}
                          </>
                        ) : span ? (
                          span
                        ) : (
                          'Dates unrecorded'
                        )}
                      </div>

                      {p.birthPlace && (
                        <div className="person-card-place" title={`Born in ${p.birthPlace}`}>
                          <span>📍</span> {p.birthPlace}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="person-luxury-foot">
                    <Link to={`/f/${familyId}/people/${p.id}`} className="person-quick-link" style={{ color: 'var(--color-accent-strong)', fontWeight: 600 }}>
                      View Profile →
                    </Link>

                    <div className="person-quick-links">
                      <Link to={`/f/${familyId}/tree?view=3d&focus=${p.id}`} className="person-quick-link" title="Focus in 3D Constellation">
                        ✨ 3D
                      </Link>
                      <Link to={`/f/${familyId}/tree?focus=${p.id}`} className="person-quick-link" title="Locate in Tree View">
                        🌳 Tree
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="person-table-card">
          <table className="person-data-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Status</th>
                <th scope="col">Lifespan / Dates</th>
                <th scope="col">Birthplace</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isAlive = resolveLiving(p.birthDate, p.deathDate, p.isLiving ?? null) === 'living';
                const name = personLabel(p);
                const span = lifespan(p.birthDate, p.deathDate);

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <Avatar name={name} src={p.photoUrl} size={36} />
                        <div>
                          <Link to={`/f/${familyId}/people/${p.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>
                            {name}
                          </Link>
                          {p.nickname && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-2)' }}>“{p.nickname}”</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={isAlive ? 'success' : 'neutral'}>
                        {isAlive ? 'Living' : 'Ancestor'}
                      </Badge>
                    </td>
                    <td className="muted">
                      {span || formatFamilyDate(p.birthDate)}
                    </td>
                    <td className="muted">
                      {p.birthPlace || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Link to={`/f/${familyId}/people/${p.id}`} className="person-quick-link">
                          Profile
                        </Link>
                        <Link to={`/f/${familyId}/tree?view=3d&focus=${p.id}`} className="person-quick-link">
                          ✨ 3D
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {searching && filtered && filtered.length > 0 && (
        <p className="muted small" style={{ marginTop: 'var(--space-3)' }} role="status">
          Showing {filtered.length} of {people?.length ?? 0} people
        </p>
      )}
    </div>
  );
}
