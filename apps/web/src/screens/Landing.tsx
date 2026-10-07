import { useRef, lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../app/store';
import { AudioPlayer } from '@ft/ui';
import {
  useHeroAnimation,
  useSplitText,
  useButtonHover,
  useCustomCursor,
  useParallax,
  useScrollStagger,
  useOrbFloat,
  useTiltCard,
} from '../hooks/useScrollAnimation';

const LandingCanvas = lazy(() => import('./LandingScene3D').then((m) => ({ default: m.LandingCanvas })));

interface DemoMember {
  id: string;
  name: string;
  ethiopianName: string;
  relation: string;
  years: string;
  location: string;
  avatar: string;
  generation: number;
}

const DEMO_MEMBERS: DemoMember[] = [
  { id: '1', name: 'Abebe Bikila', ethiopianName: 'አበበ ቢቂላ', relation: 'Great-Grandfather', years: 'c. 1908 – 1973', location: 'Gondar, Ethiopia', avatar: '👴🏾', generation: 1 },
  { id: '2', name: 'Taytu Betul', ethiopianName: 'ጣይቱ ብጡል', relation: 'Great-Grandmother', years: 'c. 1914 – 1996', location: 'Harar, Ethiopia', avatar: '👵🏾', generation: 1 },
  { id: '3', name: 'Yohannes Abebe', ethiopianName: 'ዮሐንስ አበበ', relation: 'Grandfather', years: '1934 – 2002', location: 'Addis Ababa', avatar: '👨🏾‍🦳', generation: 2 },
  { id: '4', name: 'Almaz Kassa', ethiopianName: 'አልማዝ ካሣ', relation: 'Grandmother', years: 'b. 1938', location: 'Addis Ababa', avatar: '👵🏾', generation: 2 },
  { id: '5', name: 'Dawit Yohannes', ethiopianName: 'ዳዊት ዮሐንስ', relation: 'Father', years: 'b. 1968', location: 'Washington, DC', avatar: '👨🏾', generation: 3 },
  { id: '6', name: 'Hanna Mengistu', ethiopianName: 'ሐና መንግሥቱ', relation: 'Mother', years: 'b. 1972', location: 'London, UK', avatar: '👩🏾', generation: 3 },
  { id: '7', name: 'Sara Dawit', ethiopianName: 'ሳራ ዳዊት', relation: 'Daughter', years: 'b. 1998', location: 'Toronto, Canada', avatar: '👩🏾‍🦱', generation: 4 },
  { id: '8', name: 'Noah Dawit', ethiopianName: 'ኖኅ ዳዊት', relation: 'Grandson', years: 'b. 2024', location: 'Addis Ababa', avatar: '👶🏾', generation: 5 },
];

const CALENDAR_EXAMPLES = [
  {
    event: 'Enkutatash (Ethiopian New Year)',
    ethiopian: '1 መስከረም 2016 ዓ.ም.',
    gregorian: 'September 12, 2023',
    note: 'Start of the Ethiopian civil year · 13 months of sunshine',
  },
  {
    event: 'Genna (Ethiopian Christmas / Lidet)',
    ethiopian: '29 ታኅሣሥ 2016 ዓ.ም.',
    gregorian: 'January 7, 2024',
    note: 'Celebrated according to the Julian & Ge\'ez liturgical calculation',
  },
  {
    event: 'Grandfather\'s Circa Birth Record',
    ethiopian: 'ግምት 1926 ዓ.ም. (circa)',
    gregorian: 'Circa 1934 (approximate)',
    note: 'First-class support for uncertain & range dates without false precision',
  },
];

const KINSHIP_TERMS = [
  { english: "Father's Sister", amharic: 'አክስት', translit: 'Akist', meaning: 'Paternal Aunt' },
  { english: "Mother's Brother", amharic: 'አጎት', translit: 'Agot', meaning: 'Maternal Uncle' },
  { english: 'Paternal Grandfather', amharic: 'አያት', translit: 'Ayat', meaning: 'Grandfather' },
  { english: 'Brother / Sister', amharic: 'ወንድም / እህት', translit: 'Wendim / Ihit', meaning: 'Sibling (computed from shared parents)' },
];

export function Landing() {
  const { user } = useApp();
  const nav = useNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('5');
  const [activeCalTab, setActiveCalTab] = useState<number>(0);

  useHeroAnimation(headlineRef, subtextRef, ctaRef);
  useSplitText('#how-title', 0.04);
  useSplitText('#tapestry-title', 0.04);
  useSplitText('#heritage-title', 0.04);
  useSplitText('#audio-title', 0.04);
  useButtonHover('.ft-btn--primary');
  useButtonHover('.ft-btn--ghost');
  useCustomCursor();
  useParallax('.interactive-hero-card', 0.08);
  useOrbFloat('.orb');
  useScrollStagger('.timeline-step', 0.1);
  useTiltCard('.tilt-card');

  const selectedMember = DEMO_MEMBERS.find((m) => m.id === selectedDemoId) ?? DEMO_MEMBERS[0]!;

  return (
    <div className="landing">
      {/* 3D Living Ancestral Tree Canvas Background */}
      <div className="canvas-container" aria-hidden="true">
        <Suspense fallback={<div className="canvas-loading-shimmer" />}>
          <LandingCanvas />
        </Suspense>
      </div>

      {/* Atmospheric Glowing Orbs */}
      <div className="orb orb--primary" style={{ top: '8%', left: '50%', transform: 'translateX(-50%)' }} />
      <div className="orb orb--secondary" style={{ top: '45%', right: '-8%', width: '450px', height: '450px' }} />
      <div className="orb orb--primary" style={{ top: '80%', left: '-6%', width: '500px', height: '500px', opacity: 0.45 }} />

      <div className="landing-content">
        {/* Navigation Bar */}
        <header className="landing-nav glass-panel">
          <Link to="/" className="brand" aria-label="FamilyTree Home">
            <span className="brand-emblem" aria-hidden="true">✦</span>
            <span className="brand-title">FamilyTree</span>
            <span className="brand-ethiopic" lang="am">የትውልድ ቅርስ</span>
          </Link>

          <nav aria-label="Main Navigation" className="landing-nav-links">
            <a href="#tapestry" className="nav-link">Generations</a>
            <a href="#heritage" className="nav-link">Cultural Calendars</a>
            <a href="#audio-vault" className="nav-link">Oral Vault</a>
            <a href="#canvas-view" className="nav-link">Tree Engine</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <button className="ft-btn ft-btn--primary" onClick={() => nav('/families')}>
                Open Your Family Tree →
              </button>
            ) : (
              <>
                <Link to="/login" className="ft-btn ft-btn--ghost">Sign in</Link>
                <Link to="/register" className="ft-btn ft-btn--primary">Start Free Tree</Link>
              </>
            )}
          </div>
        </header>

        {/* Monumental Hero Section */}
        <main className="landing-hero" id="main" ref={heroRef}>
          <div className="hero-eyebrow-wrap">
            <span className="hero-eyebrow-pill">
              <span className="pill-dot" />
              <span>THE LIVING ANCESTRAL ARCHIVE</span>
              <span className="pill-star">✦</span>
              <span className="pill-tag">FOR ETERNITY</span>
            </span>
          </div>

          <h1 id="landing-headline" ref={headlineRef} className="hero-monumental-headline">
            Every name has roots.<br />
            <span className="italic-serif text-gradient-brand">Every family has a story.</span>
          </h1>

          <p id="landing-subtext" ref={subtextRef} className="hero-editorial-subtext">
            A private sanctuary to trace your lineage across generations, preserve the living voices of your elders, and honor your cultural heritage with exact and circa dates.
          </p>

          <div className="hero-cta-group">
            {user ? (
              <Link
                to="/families"
                ref={ctaRef as React.RefObject<HTMLAnchorElement>}
                className="ft-btn ft-btn--primary ft-btn--xl cta-glow"
              >
                <span>Open Your Family Tree</span>
                <span className="btn-arrow">→</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  ref={ctaRef as React.RefObject<HTMLAnchorElement>}
                  className="ft-btn ft-btn--primary ft-btn--xl cta-glow"
                >
                  <span>Begin Weaving Your Family Tree</span>
                  <span className="btn-arrow">→</span>
                </Link>
                <Link to="/login" className="ft-btn ft-btn--ghost ft-btn--xl">
                  <span>Explore Interactive Demo</span>
                </Link>
              </>
            )}
          </div>

          {/* Interactive Live Mini-Tree Preview Card */}
          <div className="hero-interactive-stage">
            <div className="interactive-hero-card glass-panel tilt-card">
              <div className="card-top-bar">
                <div className="card-badge">
                  <span className="pulse-indicator" />
                  <span>ACTIVE KINSHIP BLUEPRINT · 5 GENERATIONS</span>
                </div>
                <div className="card-calendar-chip" title="Active Calendar System">
                  📅 Gregorian & Ethiopian Ge'ez
                </div>
              </div>

              {/* Connected Generational Nodes */}
              <div className="mini-tree-grid">
                {DEMO_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedDemoId(member.id)}
                    className={`mini-member-pill ${selectedDemoId === member.id ? 'is-active' : ''}`}
                  >
                    <span className="pill-avatar">{member.avatar}</span>
                    <span className="pill-text">
                      <strong className="pill-name">{member.name}</strong>
                      <span className="pill-amharic" lang="am">{member.ethiopianName}</span>
                      <small className="pill-relation">{member.relation} · {member.years}</small>
                    </span>
                    {selectedDemoId === member.id && <span className="pill-check">✦</span>}
                  </button>
                ))}
              </div>

              {/* Selected Relative Spotlight Drawer */}
              <div className="member-spotlight-bar">
                <div className="spotlight-avatar">{selectedMember.avatar}</div>
                <div className="spotlight-info">
                  <div className="spotlight-names">
                    <span className="spotlight-title">{selectedMember.name}</span>
                    <span className="spotlight-geez" lang="am">({selectedMember.ethiopianName})</span>
                  </div>
                  <div className="spotlight-meta">
                    <span>{selectedMember.relation}</span>
                    <span>•</span>
                    <span>{selectedMember.years}</span>
                    <span>•</span>
                    <span>📍 {selectedMember.location}</span>
                  </div>
                </div>
                <div className="spotlight-action">
                  <Link to="/login" className="spotlight-link">
                    View in Tree →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Cue */}
          <a href="#tapestry" className="scroll-indicator" aria-label="Scroll to explore">
            <span className="scroll-text">EXPLORE THE STORY</span>
            <div className="scroll-wheel" />
          </a>
        </main>

        {/* Chapter 1: The Generational Tapestry (150 Years of History) */}
        <section id="tapestry" className="section tapestry-section">
          <div className="section-head">
            <span className="eyebrow text-gradient-gold">✦ CHAPTER I · THE TAPESTRY OF GENERATIONS</span>
            <h2 id="tapestry-title" className="section-title">
              Built for stories that stretch<br />
              <span className="italic-serif text-gradient-brand">across centuries and continents.</span>
            </h2>
            <p className="section-desc">
              Family history rarely fits neatly into rigid Western birth certificates. FamilyTree treats uncertainty, oral memory, and diaspora migration as first-class citizens.
            </p>
          </div>

          <div className="tapestry-timeline">
            <div className="timeline-step tilt-card glass-panel">
              <div className="step-era">1890s – 1920s</div>
              <div className="step-icon">📜</div>
              <h3 className="step-heading">Ancient Roots & Oral Hearth</h3>
              <p className="step-body">
                Names preserved on the flyleaves of antique Ge'ez family bibles and recounted around evening fires in Gondar, Harar, and Shoa.
              </p>
              <div className="step-tag">Preserved by Memory</div>
            </div>

            <div className="timeline-step tilt-card glass-panel">
              <div className="step-era">1930s – 1960s</div>
              <div className="step-icon">📷</div>
              <h3 className="step-heading">Circa Dates & Faded Sepia</h3>
              <p className="step-body">
                "Circa 1934" or "Born before the rains" is honest history. We never force false day-level precision onto authentic ancestral records.
              </p>
              <div className="step-tag">Precision-Aware Dates</div>
            </div>

            <div className="timeline-step tilt-card glass-panel">
              <div className="step-era">1970s – 2000s</div>
              <div className="step-icon">🌍</div>
              <h3 className="step-heading">The Global Diaspora</h3>
              <p className="step-body">
                Branches spread to London, Toronto, Washington, Rome, and Nairobi. Connect aunts, cousins, and step-families seamlessly in one living canopy.
              </p>
              <div className="step-tag">Global Family Mesh</div>
            </div>

            <div className="timeline-step tilt-card glass-panel">
              <div className="step-era">Present & Future</div>
              <div className="step-icon">✨</div>
              <h3 className="step-heading">An Heirloom for Generations</h3>
              <p className="step-body">
                Rich high-resolution portraits, recorded elder voices, and an immutable archive that can be exported to standard GEDCOM at any moment.
              </p>
              <div className="step-tag">Exportable Forever</div>
            </div>
          </div>
        </section>

        {/* Chapter 2: Cultural Calendars & Indigenous Kinship Lab */}
        <section id="heritage" className="section heritage-section">
          <div className="section-head">
            <span className="eyebrow text-gradient-brand">✦ CHAPTER II · CULTURAL CALENDARS & KINSHIP</span>
            <h2 id="heritage-title" className="section-title">
              Honoring heritage without<br />
              <span className="italic-serif text-gradient-gold">forcing Western compromises.</span>
            </h2>
            <p className="section-desc">
              From the 13 months of the Ethiopian Ge'ez calendar to traditional kinship naming structures, your family history is presented with dignity and cultural truth.
            </p>
          </div>

          <div className="heritage-interactive-grid">
            {/* Calendar Converter Lab */}
            <div className="heritage-card glass-panel tilt-card">
              <div className="card-header-row">
                <span className="card-kicker">INTERACTIVE CALENDAR DUALITY</span>
                <span className="card-pill">Ethiopic ⇄ Gregorian</span>
              </div>
              <h3 className="card-title">Dual Calendar Engine</h3>
              <p className="card-body">
                Switch between solar Julian Ethiopian dates and standard Gregorian timestamps. Every birth, memorial, and milestone is mathematically converted on the fly.
              </p>

              <div className="calendar-tabs">
                {CALENDAR_EXAMPLES.map((ex, idx) => (
                  <button
                    key={ex.event}
                    type="button"
                    onClick={() => setActiveCalTab(idx)}
                    className={`cal-tab-btn ${activeCalTab === idx ? 'is-active' : ''}`}
                  >
                    {ex.event}
                  </button>
                ))}
              </div>

              <div className="calendar-display-board">
                <div className="cal-col">
                  <span className="cal-label">ETHIOPIAN CALENDAR (ዓ.ም.)</span>
                  <div className="cal-value-geez" lang="am">
                    {CALENDAR_EXAMPLES[activeCalTab]!.ethiopian}
                  </div>
                </div>
                <div className="cal-divider">⇄</div>
                <div className="cal-col">
                  <span className="cal-label">GREGORIAN CALENDAR</span>
                  <div className="cal-value-gregorian">
                    {CALENDAR_EXAMPLES[activeCalTab]!.gregorian}
                  </div>
                </div>
              </div>
              <div className="cal-note">
                💡 {CALENDAR_EXAMPLES[activeCalTab]!.note}
              </div>
            </div>

            {/* Kinship Terminology Lab */}
            <div className="heritage-card glass-panel tilt-card">
              <div className="card-header-row">
                <span className="card-kicker">INDIGENOUS KINSHIP COMPUTATION</span>
                <span className="card-pill">Derived, Never Rigid</span>
              </div>
              <h3 className="card-title">Intelligent Relationship Engine</h3>
              <p className="card-body">
                In FamilyTree, sibling relationships are dynamically computed from shared parents, never hardcoded as dumb edges. Cultural terms reflect genuine kinship bonds.
              </p>

              <div className="kinship-term-list">
                {KINSHIP_TERMS.map((term) => (
                  <div key={term.english} className="kinship-row">
                    <div className="kinship-en">
                      <strong>{term.english}</strong>
                      <small>{term.meaning}</small>
                    </div>
                    <div className="kinship-arrow">⟶</div>
                    <div className="kinship-am">
                      <span className="amharic-badge" lang="am">{term.amharic}</span>
                      <small className="translit">({term.translit})</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Chapter 3: The Oral Vault (Gursha Podcast Inspired Audio Feature) */}
        <section id="audio-vault" className="section audio-section">
          <div className="section-head">
            <span className="eyebrow text-gradient-gold">✦ CHAPTER III · THE ORAL VAULT</span>
            <h2 id="audio-title" className="section-title">
              Because a family tree without voices<br />
              <span className="italic-serif text-gradient-brand">is only a diagram.</span>
            </h2>
            <p className="section-desc">
              Inspired by the warmth of audio storytelling, FamilyTree lets you attach spoken recordings, blessings, and laughter directly to each family member's timeline.
            </p>
          </div>

          <div className="audio-player-card glass-panel tilt-card">
            <div className="audio-player-top">
              <div className="speaker-avatar">👵🏾</div>
              <div className="audio-meta">
                <span className="audio-badge">SAMPLE RECORDING</span>
                <h3 className="audio-title-text">
                  How an oral history sounds in the archive
                </h3>
                <span className="audio-sub">
                  A sample clip, so you can hear the player before you sign up. Your own recordings are private by default.
                </span>
              </div>
            </div>

            <AudioPlayer
              src="https://cdn.freesound.org/previews/512/512689_11200236-lq.mp3"
              label="sample oral history recording"
              className="audio-landing-player"
            />

            <div className="audio-player-bottom">
              <span className="audio-snippet" lang="am">
                «የዛሬው ቀን እንዲህ በቀላሉ አልመጣም፤ ልጆቻችን ማወቅ አለባቸው...»
              </span>
              <span className="audio-format-badge">Your original upload is kept, always</span>
            </div>
          </div>
        </section>

        {/* Chapter 4: Precision Tree Engine & Layout Architecture */}
        <section id="canvas-view" className="section engine-section">
          <div className="section-head">
            <span className="eyebrow text-gradient-brand">✦ CHAPTER IV · THE GRAPH ENGINE</span>
            <h2 id="how-title" className="section-title">
              Pure layout physics.<br />
              <span className="italic-serif text-gradient-gold">Deterministic, cycle-safe, accessible.</span>
            </h2>
            <p className="section-desc">
              Underneath the rich visuals is a bulletproof genealogical algorithm designed to gracefully support complex modern family dynamics.
            </p>
          </div>

          <div className="engine-feature-grid">
            <div className="engine-card glass-panel tilt-card">
              <div className="engine-icon">📐</div>
              <h3>Union-Based Graph Physics</h3>
              <p>
                Spouses, step-families, half-siblings, and adoptions layout deterministically without crossing lines or jumping when panning.
              </p>
            </div>

            <div className="engine-card glass-panel tilt-card">
              <div className="engine-icon">⌨️</div>
              <h3>ARIA Tree & Keyboard Navigation</h3>
              <p>
                Full accessibility fallback with arrow-key navigation, screen-reader hierarchical announcements, and a clean tabular list mode.
              </p>
            </div>

            <div className="engine-card glass-panel tilt-card">
              <div className="engine-icon">🛡️</div>
              <h3>Visibility On Every Record</h3>
              <p>
                Every person, story and photo carries its own visibility — private, family, chosen members, or public —
                and every read is checked against it. Nothing is public because you forgot to make it private.
              </p>
            </div>

            <div className="engine-card glass-panel tilt-card">
              <div className="engine-icon">📦</div>
              <h3>Open Standards & Zero Lock-in</h3>
              <p>
                One-click GEDCOM and JSON export. Your family history will never be trapped behind a subscription paywall.
              </p>
            </div>
          </div>
        </section>

        {/* Grand Footer & Call To Action */}
        <footer className="landing-foot glass-panel">
          <div className="footer-proverb">
            <span className="proverb-geez" lang="am">«ከሥር ካልተነሱ ቅርንጫፍ አይበቅልም»</span>
            <span className="proverb-translation">"Without deep roots, no branch can flourish."</span>
          </div>

          <div className="footer-cta-block">
            <h2 className="footer-headline">Begin preserving your family history today.</h2>
            <p className="footer-sub">
              Every field optional. Every story preserved. Fully private and free to begin.
            </p>

            <Link
              to="/register"
              className="ft-btn ft-btn--primary ft-btn--xl cta-glow"
            >
              <span>Create Your Family Sanctuary — Free</span>
              <span className="btn-arrow">→</span>
            </Link>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-brand">
              <span className="brand-emblem">✦</span> FamilyTree · Built with honor and craft
            </div>
            <div className="footer-links">
              <Link to="/login">Sign In</Link>
              <span>•</span>
              <Link to="/register">Create Tree</Link>
              <span>•</span>
              <a href="#tapestry">Generations</a>
              <span>•</span>
              <a href="#heritage">Calendars</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
