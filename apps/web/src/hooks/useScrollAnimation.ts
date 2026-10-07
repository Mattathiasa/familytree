import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/* prefers-reduced-motion is honoured throughout, not selectively (UI_UX.md §8,
   spec §57). useCustomCursor and useTiltCard already checked; the six scroll
   and entrance animations below did not, so a visitor who had asked the OS for
   less motion still got parallax, staggered reveals, word-by-word headline
   builds, floating orbs and springy buttons. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useHeroAnimation(
  headlineRef: React.RefObject<HTMLElement | null>,
  subtextRef: React.RefObject<HTMLElement | null>,
  ctaRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (typeof window === 'undefined' || !headlineRef.current || !subtextRef.current || !ctaRef.current) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(headlineRef.current, {
        y: 60,
        opacity: 0,
        duration: 1.1,
        skewY: 3,
      })
        .from(
          subtextRef.current,
          { y: 30, opacity: 0, duration: 0.8 },
          '-=0.6'
        )
        .from(
          ctaRef.current,
          { y: 20, opacity: 0, duration: 0.7, scale: 0.92 },
          '-=0.5'
        );
    });

    return () => ctx.revert();
  }, [headlineRef, subtextRef, ctaRef]);
}

export function useParallax(selector: string, amount = 0.15) {
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(selector).forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            gsap.set(el, { y: Math.sin(self.progress * Math.PI) * amount * 100 });
          },
        });
      });
    });

    return () => ctx.revert();
  }, [selector, amount]);
}

export function useScrollStagger(selector: string, stagger = 0.1) {
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.batch(selector, {
        onEnter: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            stagger,
            ease: 'power3.out',
            overwrite: true,
          });
        },
        onLeave: (batch) => {
          gsap.to(batch, {
            opacity: 0,
            y: -20,
            stagger,
            ease: 'power3.out',
            overwrite: true,
          });
        },
        onEnterBack: (batch) => {
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            stagger,
            ease: 'power3.out',
            overwrite: true,
          });
        },
        start: 'top 85%',
        end: 'bottom 15%',
      });
    });

    return () => ctx.revert();
  }, [selector, stagger]);
}

export function useSplitText(selector: string, stagger = 0.06) {
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(selector);
      items.forEach((item) => {
        if (item.querySelector('.stw')) return;
        const text = item.textContent || '';
        const words = text.split(/(\s+)/).filter((w) => w.trim().length > 0);
        const html = words
          .map((w) => `<span class="stw">${w}</span>`)
          .join(' ');
        item.innerHTML = html;
        item.classList.add('stx');

        const spans = item.querySelectorAll('.stw');
        gsap.from(spans, {
          opacity: 0,
          y: 18,
          rotateX: -10,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
          },
        });
      });
    });

    return () => ctx.revert();
  }, [selector, stagger]);
}

export function useButtonHover(selector: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const cleanupFns: Array<() => void> = [];
      gsap.utils.toArray<HTMLElement>(selector).forEach((el) => {
        const enter = () => {
          gsap.to(el, {
            scale: 1.05,
            y: -2,
            duration: 0.3,
            ease: 'power2.out',
          });
        };
        const leave = () => {
          gsap.to(el, {
            scale: 1,
            y: 0,
            duration: 0.4,
            ease: 'power2.out',
          });
        };
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', leave);
        cleanupFns.push(() => el.removeEventListener('mouseenter', enter));
        cleanupFns.push(() => el.removeEventListener('mouseleave', leave));
      });

      return () => cleanupFns.forEach((fn) => fn());
    });

    return () => ctx.revert();
  }, [selector]);
}

export function useOrbFloat(selector: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(selector).forEach((el, i) => {
        gsap.to(el, {
          scale: 1.08,
          x: () => (Math.random() - 0.5) * 20,
          y: () => (Math.random() - 0.5) * 20,
          duration: 24 + i * 4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });
    });

    return () => ctx.revert();
  }, [selector]);
}

export function useCustomCursor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia) return;
    if (window.matchMedia('(pointer: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);

    gsap.set(dot, { x: 0, y: 0 });

    document.body.classList.add('cursor-active');

    const move = (e: MouseEvent) => {
      gsap.to(dot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.12,
        ease: 'power2.out',
      });
    };

    const enterHover = () => {
      dot.classList.add('cursor-dot--hover');
      dot.style.transform = 'translate(-50%, -50%) scale(1.8)';
    };
    const leaveHover = () => {
      dot.classList.remove('cursor-dot--hover');
      dot.style.transform = 'translate(-50%, -50%) scale(1)';
    };
    const show = () => dot.classList.add('cursor-dot--visible');
    const hide = () => {
      dot.classList.remove('cursor-dot--visible', 'cursor-dot--hover');
      dot.style.transform = 'translate(-50%, -50%) scale(1)';
    };

    const hoverEls = document.querySelectorAll(
      'button, [role="button"], a, .ft-btn, .ft-card, .landing-points li, .brand, .step, .family-card, .person-card'
    );

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseenter', show);
    document.addEventListener('mouseleave', hide);
    hoverEls.forEach((el) => {
      el.addEventListener('mouseenter', enterHover);
      el.addEventListener('mouseleave', leaveHover);
    });

    show();

    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseenter', show);
      document.removeEventListener('mouseleave', hide);
      hoverEls.forEach((el) => {
        el.removeEventListener('mouseenter', enterHover);
        el.removeEventListener('mouseleave', leaveHover);
      });
      document.body.classList.remove('cursor-active');
      dot.remove();
    };
  }, []);
}

export function useTiltCard(selector: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const cards = gsap.utils.toArray<HTMLElement>(selector);
    const cleanups: Array<() => void> = [];

    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotX = ((y - cy) / cy) * -6;
        const rotY = ((x - cx) / cx) * 6;

        gsap.to(card, {
          transformPerspective: 800,
          rotateX: rotX,
          rotateY: rotY,
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      };

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach((c) => c());
  }, [selector]);
}
