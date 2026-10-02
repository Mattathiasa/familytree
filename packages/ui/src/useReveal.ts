/* useReveal — adds the .reveal + .is-visible classes to elements as they
   enter the viewport, enabling the fade+lift animation from global.css.
   Falls back to immediate reveal on reduced-motion. */

import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useReveal(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }

    // If already in viewport, reveal immediately (no flash)
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight * 0.85;

    const onEnter = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observerRef.current?.unobserve(entry.target);
        }
      });
    };

    observerRef.current = new IntersectionObserver(onEnter, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px',
    });

    el.classList.add('reveal');
    if (inView) {
      requestAnimationFrame(() => el.classList.add('is-visible'));
    } else {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
