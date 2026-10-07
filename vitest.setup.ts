/* jsdom has no matchMedia, and the app asks for it in three places: the
   prefers-reduced-motion checks, the theme toggle's initial value, and GSAP's
   ScrollTrigger — which calls it at module-import time, so this has to be in
   place before any import runs, not in a beforeEach. */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof window !== 'undefined' && !window.matchMedia) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

/* React Testing Library's automatic cleanup needs a global afterEach; the suite
   imports its test helpers explicitly instead, so unmount between tests here. */
afterEach(() => {
  cleanup();
});
