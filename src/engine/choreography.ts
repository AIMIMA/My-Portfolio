import { useCallback, useEffect, useRef, useState } from 'react';
import type { OverlayId, StageId } from '../types/portfolio';

export interface CameraPose3D {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface EgyptBlendState {
  heroOpacity: number;
  mapOpacity: number;
  overlayOpacity: number;
  heroInteractive: boolean;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function cubicBezier1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return (
    u * u * u * p0 +
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * Computes the deterministic Three.js camera spline pose for `progress` in [0..1].
 * At p = 0: warm studio angle framing the maquette rim & leaning consultant.
 * At p >= 0.88: overhead zenith view conformally aligned with MapLibre Egypt framing.
 */
export function computeHeroCameraPose(progress: number): CameraPose3D {
  const t = clamp01(progress / 0.88);
  const px = cubicBezier1D(0.38, 0.28, 0.08, 0.0, t);
  const py = cubicBezier1D(1.36, 1.85, 2.55, 2.92, t);
  const pz = cubicBezier1D(2.58, 1.75, 0.48, 0.001, t);

  const tx = cubicBezier1D(0.12, 0.08, 0.02, 0.0, t);
  const ty = cubicBezier1D(0.08, 0.05, 0.02, 0.0, t);
  const tz = cubicBezier1D(0.16, 0.1, 0.03, 0.0, t);

  const fov = cubicBezier1D(40, 39, 37, 36, t);

  return {
    position: [px, py, pz],
    target: [tx, ty, tz],
    fov,
  };
}

/**
 * Computes synchronized optical cross-dissolve opacities for Hero and Map layers.
 */
export function computeEgyptBlend(progress: number): EgyptBlendState {
  const p = clamp01(progress);
  const overlayOpacity = clamp01(1 - p / 0.42);
  const heroOpacity = p <= 0.52 ? 1 : clamp01(1 - (p - 0.52) / 0.42);
  const mapOpacity = p <= 0.45 ? 0 : clamp01((p - 0.45) / 0.42);

  return {
    heroOpacity,
    mapOpacity,
    overlayOpacity,
    heroInteractive: p < 0.5,
  };
}

/** Reactive reduced-motion query hook supporting live mid-session emulation toggles. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => setReduced(mql.matches);
    setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export interface UseChoreographyOptions {
  initialProgress: 0 | 1;
  stage: StageId;
  overlay: OverlayId;
  reducedMotion: boolean;
  onReachEgypt: () => void;
  onReachHero: () => void;
  onEnterTransition: () => void;
}

export interface ChoreographyController {
  diveProgress: number;
  isDiveMoving: boolean;
  setDiveProgressImmediate: (next: number) => void;
  animateDiveTo: (target: 0 | 1, onComplete?: () => void) => void;
  cancelDiveAnimation: () => void;
}

function isScrollIsolatedElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '.side-drawer, .modal-dialog, .search-results, .governorate-rail, .mp-legend, [data-scroll-isolated="true"]',
    ),
  );
}

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return (el as HTMLElement).isContentEditable === true;
}

export function useChoreography({
  initialProgress,
  stage,
  overlay,
  reducedMotion,
  onReachEgypt,
  onReachHero,
  onEnterTransition,
}: UseChoreographyOptions): ChoreographyController {
  const [diveProgress, setDiveProgress] = useState<number>(initialProgress);
  const [isDiveMoving, setIsDiveMoving] = useState<boolean>(false);

  const progressRef = useRef<number>(initialProgress);
  const rafRef = useRef<number | null>(null);
  const wheelSettleTimerRef = useRef<number | null>(null);
  const latestRefs = useRef({
    stage,
    overlay,
    reducedMotion,
    onReachEgypt,
    onReachHero,
    onEnterTransition,
  });

  latestRefs.current = {
    stage,
    overlay,
    reducedMotion,
    onReachEgypt,
    onReachHero,
    onEnterTransition,
  };

  const clearTimers = useCallback((): void => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (wheelSettleTimerRef.current !== null) {
      window.clearTimeout(wheelSettleTimerRef.current);
      wheelSettleTimerRef.current = null;
    }
  }, []);

  const cancelDiveAnimation = useCallback((): void => {
    clearTimers();
    setIsDiveMoving(false);
  }, [clearTimers]);

  const applyScrubValue = useCallback((rawNext: number): void => {
    let next = clamp01(rawNext);
    if (next >= 0.985) next = 1;
    if (next <= 0.015) next = 0;

    progressRef.current = next;
    setDiveProgress(next);

    if (next >= 1) {
      latestRefs.current.onReachEgypt();
    } else if (next <= 0) {
      latestRefs.current.onReachHero();
    } else {
      latestRefs.current.onEnterTransition();
    }
  }, []);

  const setDiveProgressImmediate = useCallback(
    (rawNext: number): void => {
      clearTimers();
      const next = clamp01(rawNext);
      progressRef.current = next;
      setDiveProgress(next);
      setIsDiveMoving(false);
    },
    [clearTimers],
  );

  const animateDiveTo = useCallback(
    (target: 0 | 1, onComplete?: () => void): void => {
      clearTimers();
      const start = progressRef.current;
      if (Math.abs(target - start) < 0.005 || latestRefs.current.reducedMotion) {
        progressRef.current = target;
        setDiveProgress(target);
        setIsDiveMoving(false);
        if (target === 1) {
          latestRefs.current.onReachEgypt();
        } else {
          latestRefs.current.onReachHero();
        }
        onComplete?.();
        return;
      }

      setIsDiveMoving(true);
      latestRefs.current.onEnterTransition();

      const durationMs = Math.max(220, Math.round(420 * Math.abs(target - start)));
      const startTime = performance.now();

      const step = (now: number): void => {
        const elapsed = now - startTime;
        const t = clamp01(elapsed / durationMs);
        const eased = easeInOutCubic(t);
        const value = start + (target - start) * eased;

        if (t < 1) {
          progressRef.current = value;
          setDiveProgress(value);
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          progressRef.current = target;
          setDiveProgress(target);
          setIsDiveMoving(false);
          if (target === 1) {
            latestRefs.current.onReachEgypt();
          } else {
            latestRefs.current.onReachHero();
          }
          onComplete?.();
        }
      };

      rafRef.current = window.requestAnimationFrame(step);
    },
    [clearTimers],
  );

  useEffect(() => {
    const onWheel = (event: WheelEvent): void => {
      const { stage: curStage, overlay: curOverlay } = latestRefs.current;
      if (curOverlay !== 'none') return;
      if (curStage === 'governorate' || curStage === 'project') return;
      if (isScrollIsolatedElement(event.target)) return;

      const deltaY = event.deltaY;
      if (deltaY === 0) return;

      // In Egypt overview, only upward scroll reverses back toward Hero maquette
      if (curStage === 'egypt' && deltaY > 0) {
        return;
      }
      if (curStage === 'hero' && deltaY < 0 && progressRef.current <= 0) {
        return;
      }

      event.preventDefault();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const modeScale = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? 320 : 1;
      const normalizedPx = Math.max(-320, Math.min(320, deltaY * modeScale));
      const deltaProgress = normalizedPx / 960;
      const next = clamp01(progressRef.current + deltaProgress);

      setIsDiveMoving(true);
      applyScrubValue(next);

      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
      }
      wheelSettleTimerRef.current = window.setTimeout(() => {
        wheelSettleTimerRef.current = null;
        setIsDiveMoving(false);
      }, 90);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const { stage: curStage, overlay: curOverlay } = latestRefs.current;
      if (curOverlay !== 'none') return;
      if (curStage !== 'hero' && curStage !== 'transition' && curStage !== 'egypt') return;
      if (isEditableElement(document.activeElement)) return;

      let stepDelta = 0;
      if (event.key === 'PageDown') {
        stepDelta = 0.5;
      } else if (event.key === 'ArrowDown') {
        stepDelta = 0.28;
      } else if (event.key === 'PageUp') {
        stepDelta = -0.5;
      } else if (event.key === 'ArrowUp') {
        stepDelta = -0.28;
      } else {
        return;
      }

      if (curStage === 'egypt' && stepDelta > 0) return;
      if (curStage === 'hero' && stepDelta < 0 && progressRef.current <= 0) return;

      event.preventDefault();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const next = clamp01(progressRef.current + stepDelta);
      setIsDiveMoving(false);
      applyScrubValue(next);
    };

    let touchActive = false;
    let lastTouchY = 0;

    const onTouchStart = (event: TouchEvent): void => {
      const { stage: curStage, overlay: curOverlay } = latestRefs.current;
      if (curOverlay !== 'none') {
        touchActive = false;
        return;
      }
      if (curStage === 'governorate' || curStage === 'project') {
        touchActive = false;
        return;
      }
      if (isScrollIsolatedElement(event.target) || event.touches.length !== 1) {
        touchActive = false;
        return;
      }
      const firstTouch = event.touches[0];
      if (!firstTouch) return;
      touchActive = true;
      lastTouchY = firstTouch.clientY;
    };

    const onTouchMove = (event: TouchEvent): void => {
      if (!touchActive || event.touches.length !== 1) return;
      const { stage: curStage, overlay: curOverlay } = latestRefs.current;
      if (curOverlay !== 'none' || curStage === 'governorate' || curStage === 'project') {
        touchActive = false;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;

      const deltaY = lastTouchY - touch.clientY;
      lastTouchY = touch.clientY;
      if (deltaY === 0) return;

      if (curStage === 'egypt' && deltaY > 0) return;
      if (curStage === 'hero' && deltaY < 0 && progressRef.current <= 0) return;

      if (event.cancelable) {
        event.preventDefault();
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const deltaProgress = Math.max(-0.35, Math.min(0.35, deltaY / 620));
      const next = clamp01(progressRef.current + deltaProgress);

      setIsDiveMoving(true);
      applyScrubValue(next);

      if (wheelSettleTimerRef.current !== null) {
        window.clearTimeout(wheelSettleTimerRef.current);
      }
      wheelSettleTimerRef.current = window.setTimeout(() => {
        wheelSettleTimerRef.current = null;
        setIsDiveMoving(false);
      }, 90);
    };

    const onTouchEnd = (): void => {
      touchActive = false;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      clearTimers();
    };
  }, [applyScrubValue, clearTimers]);

  return {
    diveProgress,
    isDiveMoving,
    setDiveProgressImmediate,
    animateDiveTo,
    cancelDiveAnimation,
  };
}
