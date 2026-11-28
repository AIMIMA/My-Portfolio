import * as THREE from 'three';
import { CONSULTANT_PROFILE } from '../data';
import { resolvePublicAssetUrl } from '../utils/urlSync';

export interface ConsultantFigureHandle {
  group: THREE.Group;
  setParallax: (nx: number, ny: number) => void;
  setFade: (opacity: number) => void;
  dispose: () => void;
}

/**
 * Generates a crisp procedural architectural silhouette & monogram canvas texture
 * used immediately before image decode and permanently if the portrait asset fails (EC-15).
 */
export function createFallbackConsultantCanvas(monogram = 'AIM'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, 480, 600);

  // Subtle warm brass halo behind silhouette
  const halo = ctx.createRadialGradient(240, 220, 20, 240, 240, 210);
  halo.addColorStop(0, 'rgba(207, 157, 79, 0.28)');
  halo.addColorStop(1, 'rgba(207, 157, 79, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 480, 600);

  // Architectural tailored blazer + head/shoulders silhouette leaning on rim
  ctx.fillStyle = '#25211c';
  ctx.strokeStyle = '#cf9d4f';
  ctx.lineWidth = 3;

  // Head
  ctx.beginPath();
  ctx.arc(244, 148, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Shoulders & leaning torso
  ctx.beginPath();
  ctx.moveTo(118, 560);
  ctx.quadraticCurveTo(126, 260, 188, 228);
  ctx.lineTo(304, 224);
  ctx.quadraticCurveTo(368, 256, 376, 560);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Forearm resting on maquette rim
  ctx.fillStyle = '#2e2923';
  ctx.beginPath();
  ctx.roundRect(108, 520, 268, 42, 18);
  ctx.fill();
  ctx.stroke();

  // Monogram crest
  ctx.fillStyle = '#ebdcca';
  ctx.font = '600 36px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(monogram, 244, 348);

  return canvas;
}

/**
 * Loads the consultant portrait URL via browser `Image()` (triggering real network request
 * observable by E2E asset trackers and fault injectors) without ever leaving a broken DOM `<img>`.
 */
export function preloadConsultantPortrait(
  url: string | null,
  onLoaded: (img: HTMLImageElement) => void,
  onFallback?: () => void,
): () => void {
  const resolved = resolvePublicAssetUrl(url);
  if (!resolved || typeof Image === 'undefined') {
    onFallback?.();
    return () => {};
  }

  let cancelled = false;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    if (cancelled) return;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      onLoaded(img);
    } else {
      onFallback?.();
    }
  };
  img.onerror = () => {
    if (cancelled) return;
    onFallback?.();
  };
  img.src = resolved;

  return () => {
    cancelled = true;
  };
}

/**
 * Creates the rim-anchored 3D alpha-cutout consultant figure leaning on the foreground
 * edge of the Egypt maquette table, with contact shadow and subtle pointer parallax.
 */
export function createConsultantFigure(
  onRequestRender: () => void,
): ConsultantFigureHandle {
  const group = new THREE.Group();
  const anchor = CONSULTANT_PROFILE.portraitAnchor ?? { x: 0, y: 0, scale: 1 };
  const aspect = CONSULTANT_PROFILE.portraitFallback?.heroAspectRatio ?? 0.8;

  const baseX = 0.62 + anchor.x * 0.1;
  const baseY = 0.44 + anchor.y * 0.1;
  const baseZ = 1.06;

  group.position.set(baseX, baseY, baseZ);

  const fallbackCanvas = createFallbackConsultantCanvas(CONSULTANT_PROFILE.monogram);
  const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
  fallbackTexture.colorSpace = THREE.SRGBColorSpace;

  let activePhotoTexture: THREE.Texture | null = null;

  const figHeight = 0.94 * anchor.scale;
  const figWidth = figHeight * aspect;
  const planeGeo = new THREE.PlaneGeometry(figWidth, figHeight);
  const planeMat = new THREE.MeshBasicMaterial({
    map: fallbackTexture,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const figureMesh = new THREE.Mesh(planeGeo, planeMat);
  figureMesh.rotation.x = -0.14;
  figureMesh.rotation.y = -0.12;
  group.add(figureMesh);

  // Soft rim contact shadow grounding the leaning arms onto the walnut plinth edge
  const shadowGeo = new THREE.CircleGeometry(0.32, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x080706,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.scale.set(1.35, 0.55, 1);
  shadowMesh.position.set(0, -0.41, -0.05);
  group.add(shadowMesh);

  const cancelLoad = preloadConsultantPortrait(
    CONSULTANT_PROFILE.portraitUrl,
    (img) => {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      activePhotoTexture = tex;
      planeMat.map = tex;
      planeMat.needsUpdate = true;
      onRequestRender();
    },
    () => {
      onRequestRender();
    },
  );

  return {
    group,
    setParallax: (nx: number, ny: number) => {
      const clampedX = Math.max(-1, Math.min(1, nx));
      const clampedY = Math.max(-1, Math.min(1, ny));
      // Subtle ±3.5 deg yaw, ±1.8 deg pitch (strictly user-pointer-driven)
      const maxYawRad = (3.5 * Math.PI) / 180;
      const maxPitchRad = (1.8 * Math.PI) / 180;
      figureMesh.rotation.y = -0.12 + clampedX * maxYawRad;
      figureMesh.rotation.x = -0.14 + clampedY * maxPitchRad;
      group.position.x = baseX + clampedX * 0.022;
    },
    setFade: (opacity: number) => {
      const clamped = Math.max(0, Math.min(1, opacity));
      planeMat.opacity = clamped;
      shadowMat.opacity = 0.52 * clamped;
      group.visible = clamped > 0.01;
    },
    dispose: () => {
      cancelLoad();
      planeGeo.dispose();
      planeMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      fallbackTexture.dispose();
      activePhotoTexture?.dispose();
    },
  };
}
