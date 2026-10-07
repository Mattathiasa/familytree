import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { family as familyApi, livingTally } from '../api/client';
import type { ActivityItemDto, FamilyStatsDto, PersonDto } from '../api/types';
import { useApp } from '../app/store';
import { ETHIOPIC_MONTH_NAMES_AM, ethiopicEvangelistYear, gregorianToEthiopic } from '@ft/domain';
import { Button, Card, EmptyState, Skeleton, useReveal } from '@ft/ui';
import { useButtonHover, useSplitText, useTiltCard } from '../hooks/useScrollAnimation';

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Ethiopian calendar calculation helper for today
/* Today in the Ethiopian calendar, converted rather than asserted.
   @ft/domain owns the arithmetic (round-tripped across 1900–2100 EC in its
   own suite); this only formats the result. */
function getEthiopianToday(at: Date = new Date()): { ethiopic: string; evangelist: string } {
  const e = gregorianToEthiopic(at.getFullYear(), at.getMonth() + 1, at.getDate());
  const month = ETHIOPIC_MONTH_NAMES_AM[e.month - 1] ?? '';
  return {
    ethiopic: `${e.day} ${month} ${e.year} ዓ.ም.`,
    evangelist: `ዘመነ ${ethiopicEvangelistYear(e.year).am}`,
  };
}

export function Dashboard() {
  const { familyId } = useParams();
  const { user } = useApp();
  const [stats, setStats] = useState<FamilyStatsDto | null>(null);
  const [activity, setActivity] = useState<ActivityItemDto[]>([]);
  const [people, setPeople] = useState<PersonDto[]>([]);
  const [loading, setLoading] = useState(true);

  const livingCounts = useMemo(() => livingTally(people), [people]);

  const statsRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const upcomingRef = useRef<HTMLDivElement>(null);
  const onboardingRef = useRef<HTMLDivElement>(null);

  useReveal(statsRef);
  useReveal(activityRef);
  useReveal(upcomingRef, [stats?.people]);
  useReveal(onboardingRef);
  useButtonHover('.ft-btn');
  useTiltCard('.stat-tile');
  useSplitText('#dashboard-headline', 0.05);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      familyApi.stats(familyId!),
      familyApi.activity(familyId!),
      familyApi.tree(familyId!).then((t) => t.nodes).catch(() => []),
    ])
      .then(([st, act, folks]) => {
        if (!alive) return;
        setStats(st);
        setActivity(act);
        setPeople(folks);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [familyId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const ethToday = useMemo(() => getEthiopianToday(), []);

  return (
    <div className="dashboard">
      {/* Executive Hero Banner */}
      <div className="hero-header glass-panel" ref={statsRef} style={{ borderRadius: '24px', padding: '32px', marginBottom: '28px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="eyebrow text-gradient-gold">✦ ANCESTRAL OVERVIEW</div>
            <h1 id="dashboard-headline" className="font-display" style={{ fontSize: 'clamp(2rem, 1.6rem + 2vw, 3.2rem)', margin: '4px 0 8px' }}>
              {greeting}, {user?.displayName.split(' ')[0] ?? 'Friend'} 👋
            </h1>
            <p className="sub" style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Here is your family history across generations, preserved in living clarity.
            </p>
          </div>

          {/* Today's Dual Calendar Chip */}
          <div
            className="glass-panel"
            style={{
              padding: '12px 18px',
              borderRadius: '16px',
              border: '1px solid color-mix(in srgb, var(--color-gold) 45%, var(--color-border))',
              background: 'color-mix(in srgb, var(--color-gold-soft) 80%, transparent)',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.08em' }}>
              TODAY'S CULTURAL CALENDAR
            </div>
            <div style={{ fontFamily: 'var(--font-ge)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }} lang="am">
              {ethToday.ethiopic} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>({ethToday.evangelist})</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '24px 0' }}>
          <Link to={`/f/${familyId}/tree`} className="ft-btn ft-btn--primary">
            <span>🌳 Explore 2D Blueprint</span>
          </Link>
          <Link to={`/f/${familyId}/tree?view=3d`} className="ft-btn ft-btn--secondary">
            <span>✨ 3D Constellation</span>
          </Link>
          <Link to={`/f/${familyId}/people/new`} className="ft-btn ft-btn--ghost">
            <span>+ Add Relative</span>
          </Link>
          <Link to={`/f/${familyId}/memories`} className="ft-btn ft-btn--ghost">
            <span>📷 Open Vault</span>
          </Link>
        </div>

        {/* 4 Key Stat Tiles */}
        <section className="grid-stats" aria-label="Family statistics">
          {loading || !stats ? (
            Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="stat-tile" />)
          ) : (
            <>
              <div className="stat-tile glass-panel">
                <div className="stat-icon">👥</div>
                <div className="num font-display">{stats.people}</div>
                <div className="lbl">Total Relatives</div>
                <small style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                  {livingCounts.living} living · {livingCounts.deceased} ancestors{livingCounts.unknown > 0 ? ` · ${livingCounts.unknown} unrecorded` : ''}
                </small>
              </div>

              <div className="stat-tile glass-panel">
                <div className="stat-icon">🧬</div>
                <div className="num font-display">{stats.generations}</div>
                <div className="lbl">Generations Deep</div>
                <small style={{ fontSize: '0.72rem', color: 'var(--color-gold)', marginTop: '4px' }}>
                  Continuous Lineage
                </small>
              </div>

              <div className="stat-tile glass-panel">
                <div className="stat-icon">📖</div>
                <div className="num font-display">{stats.stories}</div>
                <div className="lbl">Stories Kept</div>
                <small style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                  Oral & written accounts
                </small>
              </div>

              <div className="stat-tile glass-panel">
                <div className="stat-icon">⏳</div>
                <div className="num font-display" style={{ fontSize: '1.4rem' }}>
                  {stats.oldestBirthYear ? `${stats.oldestBirthYear} – ${stats.newestBirthYear ?? 'Now'}` : '—'}
                </div>
                <div className="lbl">Historical Span</div>
                <small style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: '4px' }}>
                  Earliest ancestor record
                </small>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Two Column Layout: Activity & Upcoming Feasts */}
      <div className="two-col">
        {/* Recent Activity */}
        <Card ref={activityRef} className="glass-panel">
          <div className="panel-title font-display" style={{ fontSize: '1.4rem' }}>Recent Chronicles</div>
          {loading ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <Skeleton /><Skeleton /><Skeleton />
            </div>
          ) : activity.length === 0 ? (
            <p className="muted small">No chronicles yet. Activity appears as you add relatives, stories, and photos.</p>
          ) : (
            <ul className="list-tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {activity.map((a) => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '1.1rem' }}>✦</span>
                  <span style={{ flex: 1, fontSize: '0.88rem' }}>
                    {a.summary} <span className="muted" style={{ fontSize: '0.75rem' }}>· {timeAgo(a.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Milestones & Traditions */}
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          <Card ref={upcomingRef} className="glass-panel">
            <div className="panel-title font-display" style={{ fontSize: '1.4rem' }}>Upcoming Feasts & Traditions</div>
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'var(--color-surface-sunken)' }}>
                <span style={{ fontSize: '1.4rem' }}>🌼</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.88rem', display: 'block' }}>Season of Flowers & Harvest (ዘመነ ጽጌ)</strong>
                  <small style={{ color: 'var(--color-text-faint)' }}>Traditional autumn celebration across Ethiopian highlands</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', background: 'var(--color-surface-sunken)' }}>
                <span style={{ fontSize: '1.4rem' }}>✨</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.88rem', display: 'block' }}>Genna (Ethiopian Christmas / Lidet)</strong>
                  <small style={{ color: 'var(--color-text-faint)' }}>29 ታኅሣሥ · Traditional family gathering and ganna game</small>
                </div>
              </div>
            </div>
          </Card>

          <Card ref={onboardingRef} className="glass-panel">
            <OnboardingChecklist familyId={familyId} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function OnboardingChecklist({ familyId }: { familyId: string | undefined }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ft.onboarding.done') === '1');
  const [peopleCount, setPeopleCount] = useState<number | null>(null);

  useEffect(() => {
    familyApi.stats(familyId!).then((s) => setPeopleCount(s.people));
  }, [familyId]);

  if (dismissed) return null;
  const hasPeople = (peopleCount ?? 0) > 2;
  const steps = [
    { done: true, label: 'Create your family' },
    { done: hasPeople, label: 'Add at least 3 relatives' },
    { done: true, label: 'Explore the 3D Constellation tree' },
    { done: false, label: 'Record your first oral history voice clip' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: '1.25rem' }}>Preservation Checklist</h3>
        <button
          className="ft-btn ft-btn--ghost"
          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          onClick={() => {
            localStorage.setItem('ft.onboarding.done', '1');
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {steps.map((s, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem' }}>
            <span style={{ color: s.done ? 'var(--color-success)' : 'var(--color-border-strong)' }}>
              {s.done ? '✓' : '○'}
            </span>
            <span style={{ textDecoration: s.done ? 'line-through' : 'none', opacity: s.done ? 0.7 : 1 }}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
