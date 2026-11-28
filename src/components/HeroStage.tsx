import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIVE_GOVERNORATES,
  CONSULTANT_PROFILE,
  EGYPT_NILE_PATHS,
  EGYPT_OUTLINE_RING,
} from '../data';
import { preloadConsultantPortrait } from '../engine/consultantFigure';
import {
  createHeroMaquetteEngine,
  probeCanvasWebGL,
} from '../engine/heroMaquette';
import type { HeroMaquetteEngineHandle } from '../engine/heroMaquette';
import { getTranslations, localize } from '../i18n/translations';
import type { Locale, WebGLStatus } from '../types/portfolio';
import { projectEgyptToMaquette } from '../utils/mercator';
import { resolvePublicAssetUrl } from '../utils/urlSync';

export interface HeroStageProps {
  locale: Locale;
  diveProgress: number;
  heroOpacity: number;
  interactive: boolean;
  onWebGLStatusChange: (status: WebGLStatus) => void;
}

function toSvgPoint(lat: number, lng: number): [number, number] {
  const { x, z } = projectEgyptToMaquette(lat, lng, 220);
  // Subtle 2.5D studio isometric foreshortening on vertical axis
  return [460 + x, 310 + z * 0.78];
}

export function HeroStage({
  locale,
  diveProgress,
  heroOpacity,
  interactive,
  onWebGLStatusChange,
}: HeroStageProps) {
  const t = getTranslations(locale);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<HeroMaquetteEngineHandle | null>(null);

  const [useFallback, setUseFallback] = useState<boolean>(() => !probeCanvasWebGL());
  const [svgPortraitHref, setSvgPortraitHref] = useState<string | null>(null);
  const [heroActivated, setHeroActivated] = useState<boolean>(() => diveProgress < 1);

  useEffect(() => {
    if (diveProgress < 1 && !heroActivated) {
      setHeroActivated(true);
    }
  }, [diveProgress, heroActivated]);

  useEffect(() => {
    if (useFallback) {
      onWebGLStatusChange('fallback');
    } else if (!heroActivated) {
      onWebGLStatusChange('ready');
    }
  }, [useFallback, heroActivated, onWebGLStatusChange]);

  // Preload portrait in fallback mode too so E2E asset tracking & EC-15 fault tests work identically
  useEffect(() => {
    if (!useFallback || !heroActivated) return undefined;
    return preloadConsultantPortrait(
      CONSULTANT_PROFILE.portraitUrl,
      () => setSvgPortraitHref(resolvePublicAssetUrl(CONSULTANT_PROFILE.portraitUrl)),
      () => setSvgPortraitHref(null),
    );
  }, [useFallback, heroActivated]);

  useEffect(() => {
    if (useFallback || !heroActivated) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    const initTimer = window.setTimeout(() => {
      if (cancelled || !canvasRef.current) return;

      const handle = createHeroMaquetteEngine(canvasRef.current, {
        onContextLost: () => {
          engineRef.current = null;
          setUseFallback(true);
        },
      });

      if (!handle) {
        setUseFallback(true);
        return;
      }

      engineRef.current = handle;
      handle.setProgress(diveProgress);
      handle.setPaused(diveProgress >= 1);
      onWebGLStatusChange('ready');

      const onResize = (): void => {
        if (!canvasRef.current || !engineRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        engineRef.current.resize(
          rect.width || window.innerWidth,
          rect.height || window.innerHeight,
        );
      };

      const onPointerMove = (e: PointerEvent): void => {
        if (!engineRef.current) return;
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);
        const nx = (e.clientX / w - 0.5) * 2;
        const ny = (e.clientY / h - 0.5) * 2;
        engineRef.current.setPointer(nx, ny);
      };

      window.addEventListener('resize', onResize);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      onResize();

      cleanupListeners = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointerMove);
        engineRef.current = null;
        handle.dispose();
      };
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(initTimer);
      cleanupListeners?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFallback, heroActivated]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (diveProgress >= 1) {
      engine.setProgress(1);
      engine.setPaused(true);
    } else {
      engine.setPaused(false);
      engine.setProgress(diveProgress);
    }
  }, [diveProgress]);

  const svgPaths = useMemo(() => {
    const outlinePoints = EGYPT_OUTLINE_RING.map(([lng, lat]) => {
      const [sx, sy] = toSvgPoint(lat, lng);
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(' ');

    const toPolyline = (coords: ReadonlyArray<readonly [number, number]>): string =>
      coords
        .map(([lng, lat]) => {
          const [sx, sy] = toSvgPoint(lat, lng);
          return `${sx.toFixed(1)},${sy.toFixed(1)}`;
        })
        .join(' ');

    const pins = ACTIVE_GOVERNORATES.map((gov) => {
      const [sx, sy] = toSvgPoint(gov.center.lat, gov.center.lng);
      return {
        id: gov.id,
        isFlagship: gov.isFlagship,
        name: localize(gov.shortName, locale),
        sx,
        sy,
      };
    });

    return {
      outlinePoints,
      nileMain: toPolyline(EGYPT_NILE_PATHS.main),
      rosetta: toPolyline(EGYPT_NILE_PATHS.rosetta),
      damietta: toPolyline(EGYPT_NILE_PATHS.damietta),
      pins,
    };
  }, [locale]);

  const isHidden = diveProgress >= 1 || heroOpacity <= 0.005;
  const fallbackScale = 1 + diveProgress * 0.48;

  return (
    <div
      className="stage-layer--hero"
      aria-label={t.a11y.heroRegionLabel}
      style={{
        opacity: isHidden ? 0 : heroOpacity,
        visibility: isHidden ? 'hidden' : 'visible',
        pointerEvents: interactive && !isHidden ? 'auto' : 'none',
      }}
    >
      {!useFallback ? (
        <canvas
          ref={canvasRef}
          className="hero-webgl-canvas"
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      ) : (
        <svg
          className="hero-svg-fallback"
          viewBox="0 0 960 620"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={t.hero.maquetteCaption}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <radialGradient id="heroStudioGlow" cx="56%" cy="48%" r="54%">
              <stop offset="0%" stopColor="#26201a" />
              <stop offset="100%" stopColor="#141210" />
            </radialGradient>
            <linearGradient id="heroPlinthTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#234e5b" />
              <stop offset="100%" stopColor="#15323c" />
            </linearGradient>
            <linearGradient id="heroLimestone" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2d2b9" />
              <stop offset="100%" stopColor="#bfa989" />
            </linearGradient>
          </defs>

          <rect width="960" height="620" fill="url(#heroStudioGlow)" />

          <g
            transform={`translate(480 310) scale(${fallbackScale.toFixed(3)}) translate(-480 -310)`}
          >
            {/* Architectural Walnut Plinth & Brass Rim */}
            <polygon
              points="170,120 770,120 830,500 110,500"
              fill="#221b15"
              stroke="#cf9d4f"
              strokeWidth="2.5"
            />
            <polygon
              points="110,500 830,500 816,530 124,530"
              fill="#17120e"
              stroke="#8b6834"
              strokeWidth="1"
            />

            {/* Recessed Mediterranean & Red Sea Basin */}
            <polygon
              points="188,136 752,136 806,484 134,484"
              fill="url(#heroPlinthTop)"
            />

            {/* Extruded Egypt Relief Shadow + Bevel + Top */}
            <polygon
              points={svgPaths.outlinePoints}
              transform="translate(0, 9)"
              fill="#7d6b52"
              opacity="0.85"
            />
            <polygon
              points={svgPaths.outlinePoints}
              fill="url(#heroLimestone)"
              stroke="#f1e4cf"
              strokeWidth="1.5"
            />

            {/* Inlaid Nile Filaments */}
            <polyline
              points={svgPaths.nileMain}
              fill="none"
              stroke="#cf9d4f"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={svgPaths.rosetta}
              fill="none"
              stroke="#cf9d4f"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            <polyline
              points={svgPaths.damietta}
              fill="none"
              stroke="#cf9d4f"
              strokeWidth="2.1"
              strokeLinecap="round"
            />

            {/* 6 Active Governorate Brass Pins */}
            {svgPaths.pins.map((pin) => (
              <g key={pin.id} transform={`translate(${pin.sx.toFixed(1)}, ${pin.sy.toFixed(1)})`}>
                <ellipse cx="0" cy="0" rx="8" ry="5" fill="none" stroke="#cf9d4f" strokeWidth="1.2" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={pin.isFlagship ? -22 : -14}
                  stroke="#e7bc71"
                  strokeWidth="2"
                />
                <circle
                  cx="0"
                  cy={pin.isFlagship ? -22 : -14}
                  r={pin.isFlagship ? 5.5 : 4}
                  fill="#f3cc84"
                />
              </g>
            ))}

            {/* Rim-Anchored Leaning Consultant Figure (photo or crisp SVG silhouette) */}
            <g
              transform="translate(595, 235)"
              opacity={Math.max(0, 1 - diveProgress * 1.6).toFixed(2)}
            >
              <ellipse cx="95" cy="262" rx="68" ry="14" fill="#090807" opacity="0.55" />
              {svgPortraitHref ? (
                <image
                  href={svgPortraitHref}
                  x="10"
                  y="0"
                  width="170"
                  height="265"
                  preserveAspectRatio="xMidYMax meet"
                />
              ) : (
                <g>
                  <circle cx="95" cy="58" r="28" fill="#26211b" stroke="#cf9d4f" strokeWidth="2" />
                  <path
                    d="M35,260 Q44,116 74,98 L118,98 Q148,116 156,260 Z"
                    fill="#26211b"
                    stroke="#cf9d4f"
                    strokeWidth="2"
                  />
                  <rect
                    x="28"
                    y="238"
                    width="134"
                    height="22"
                    rx="9"
                    fill="#302922"
                    stroke="#cf9d4f"
                    strokeWidth="1.5"
                  />
                  <text
                    x="95"
                    y="172"
                    textAnchor="middle"
                    fill="#ebdcca"
                    fontSize="18"
                    fontWeight="700"
                  >
                    {CONSULTANT_PROFILE.monogram}
                  </text>
                </g>
              )}
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
