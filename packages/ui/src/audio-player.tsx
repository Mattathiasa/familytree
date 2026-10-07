/* AudioPlayer — a real one.

   Landing, PersonProfile and Memories each shipped a play button, an animated
   waveform and a duration readout that toggled React state and nothing else:
   there was no <audio> element anywhere in the app, and the seeded recordings
   had real URLs that nothing could play. Spec §29/§30 treat the recording as
   the source of truth — "the original audio must always remain available even
   if transcription exists" — so the one thing this component must actually do
   is play it.

   Accessibility (UI_UX.md §8): a real <audio> element does the work, the
   controls are buttons with names that change with state, the scrubber is a
   slider with a readable value, and the waveform is decorative only. Nothing
   auto-plays. */

import { useEffect, useId, useRef, useState } from 'react';

export interface AudioPlayerProps {
  src: string;
  /** Announced as the recording's name, e.g. the memory title. */
  label: string;
  /** Shown before metadata loads, e.g. "04:12" from the record. */
  fallbackDuration?: string;
  className?: string;
  /** Decorative bars behind the scrubber. Off under reduced motion regardless. */
  waveform?: boolean;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "04:12" → "4 minutes 12 seconds", for a screen reader. */
function spoken(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export function AudioPlayer({ src, label, fallbackDuration, className, waveform = true }: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(Number.NaN);
  const [error, setError] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // A second player starting is the first one stopping — browsers happily play
  // several at once, which is never what someone wants in a gallery.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stopOthers = () => {
      for (const other of document.querySelectorAll('audio')) {
        if (other !== el) (other as HTMLAudioElement).pause();
      }
    };
    el.addEventListener('play', stopOthers);
    return () => el.removeEventListener('play', stopOthers);
  }, []);

  async function toggle() {
    const el = ref.current;
    if (!el) return;
    try {
      if (el.paused) await el.play();
      else el.pause();
    } catch {
      setError(true);
    }
  }

  function seek(to: number) {
    const el = ref.current;
    if (el && Number.isFinite(duration)) el.currentTime = to;
  }

  const total = Number.isFinite(duration) ? duration : Number.NaN;
  const progress = Number.isFinite(total) && total > 0 ? current / total : 0;

  return (
    <div className={`ft-audio ${className ?? ''}`}>
      {/* The element that does the actual work. No autoplay, no preloading a
          whole archive of recordings. */}
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setError(true)}
      >
        <track kind="captions" />
      </audio>

      <button
        type="button"
        className="ft-audio-toggle"
        onClick={toggle}
        disabled={error}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        aria-describedby={id}
      >
        <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
      </button>

      <div className="ft-audio-body">
        <input
          type="range"
          className="ft-audio-range"
          min={0}
          max={Number.isFinite(total) ? Math.floor(total) : 0}
          value={Math.floor(current)}
          step={1}
          disabled={error || !Number.isFinite(total)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label={`Seek within ${label}`}
          aria-valuetext={`${spoken(current)} of ${spoken(total)}`}
        />
        <div className="ft-audio-meta" id={id}>
          {error
            ? <span className="ft-audio-error">This recording couldn’t be loaded.</span>
            : <>{clock(current)} / {Number.isFinite(total) ? clock(total) : (fallbackDuration ?? '--:--')}</>}
        </div>
        {waveform && !reduced && !error && (
          <div className="ft-audio-wave" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className={playing ? 'is-live' : ''}
                data-past={i / 24 <= progress ? 'true' : 'false'}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
