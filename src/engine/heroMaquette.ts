import * as THREE from 'three';
import { clamp01, computeHeroCameraPose } from './choreography';
import { createConsultantFigure } from './consultantFigure';
import {
  MAQUETTE_HALF_SPAN,
  RELIEF_DEPTH,
  buildEgyptReliefGeometry,
  buildNileFilamentGeometries,
  getMaquetteGovernoratePins,
} from './egyptReliefGeometry';

export interface HeroMaquetteEngineOptions {
  onContextLost: () => void;
}

export interface HeroMaquetteEngineHandle {
  setProgress: (progress: number) => void;
  setPointer: (nx: number, ny: number) => void;
  setPaused: (paused: boolean) => void;
  resize: (width: number, height: number) => void;
  renderNow: () => void;
  dispose: () => void;
}

export interface WebGLProbeInfo {
  supported: boolean;
  isSoftware: boolean;
}

let cachedProbe: WebGLProbeInfo | null = null;

export function probeWebGLDetails(): WebGLProbeInfo {
  if (cachedProbe !== null) {
    return cachedProbe;
  }
  if (typeof document === 'undefined' || typeof WebGLRenderingContext === 'undefined') {
    return { supported: false, isSoftware: false };
  }
  try {
    const testCanvas = document.createElement('canvas');
    const gl = (testCanvas.getContext('webgl2') ??
      testCanvas.getContext('webgl') ??
      testCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      cachedProbe = { supported: false, isSoftware: false };
      return cachedProbe;
    }
    let isSoftware = false;
    try {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
        : String(gl.getParameter(gl.RENDERER) ?? '');
      isSoftware = /swiftshader|llvmpipe|software/i.test(rendererStr);
    } catch {
      isSoftware = false;
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedProbe = { supported: true, isSoftware };
    return cachedProbe;
  } catch {
    return { supported: false, isSoftware: false };
  }
}

export function probeCanvasWebGL(): boolean {
  return probeWebGLDetails().supported;
}

export function createHeroMaquetteEngine(
  canvas: HTMLCanvasElement,
  options: HeroMaquetteEngineOptions,
): HeroMaquetteEngineHandle | null {
  const probe = cachedProbe ?? probeWebGLDetails();
  if (!probe.supported) {
    return null;
  }
  const useAntialias = !probe.isSoftware;

  const glCheck =
    canvas.getContext('webgl2', {
      antialias: useAntialias,
      alpha: false,
      powerPreference: 'high-performance',
    }) ??
    canvas.getContext('webgl', {
      antialias: useAntialias,
      alpha: false,
    });

  if (!glCheck) {
    return null;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context: glCheck as WebGLRenderingContext,
      antialias: useAntialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.setPixelRatio(probe.isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141210);
  scene.fog = new THREE.FogExp2(0x141210, 0.11);

  const initWidth = Math.max(1, canvas.clientWidth || window.innerWidth || 1280);
  const initHeight = Math.max(1, canvas.clientHeight || window.innerHeight || 800);
  renderer.setSize(initWidth, initHeight, false);

  const camera = new THREE.PerspectiveCamera(40, initWidth / initHeight, 0.08, 25);

  // Studio Three-Point Architectural Lighting
  const hemiLight = new THREE.HemisphereLight(0x9dc2ce, 0x261e17, 0.78);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffdfad, 2.15);
  keyLight.position.set(2.4, 3.6, 2.1);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xd9a657, 1.45, 7.5);
  rimLight.position.set(-1.8, 1.4, -1.5);
  scene.add(rimLight);

  const maquetteRoot = new THREE.Group();
  scene.add(maquetteRoot);

  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  // 1. Smoked Walnut & Travertine Architectural Plinth Table
  const tableWidth = MAQUETTE_HALF_SPAN * 2.38;
  const tableDepth = MAQUETTE_HALF_SPAN * 2.18;

  const plinthGeo = new THREE.BoxGeometry(tableWidth + 0.18, 0.16, tableDepth + 0.18);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x241d17,
    roughness: 0.68,
    metalness: 0.08,
  });
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.set(0, -0.095, 0);
  maquetteRoot.add(plinthMesh);
  disposableGeometries.push(plinthGeo);
  disposableMaterials.push(plinthMat);

  // Brushed-brass perimeter inlay frame
  const brassRimGeo = new THREE.BoxGeometry(tableWidth + 0.04, 0.026, tableDepth + 0.04);
  const brassRimMat = new THREE.MeshStandardMaterial({
    color: 0xcf9d4f,
    roughness: 0.34,
    metalness: 0.72,
  });
  const brassRimMesh = new THREE.Mesh(brassRimGeo, brassRimMat);
  brassRimMesh.position.set(0, -0.012, 0);
  maquetteRoot.add(brassRimMesh);
  disposableGeometries.push(brassRimGeo);
  disposableMaterials.push(brassRimMat);

  // 2. Recessed Mediterranean & Red Sea Water Basin
  const seaGeo = new THREE.PlaneGeometry(tableWidth, tableDepth);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x1d4a57,
    roughness: 0.28,
    metalness: 0.22,
  });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.rotation.x = -Math.PI / 2;
  seaMesh.position.set(0, 0.002, 0);
  maquetteRoot.add(seaMesh);
  disposableGeometries.push(seaGeo);
  disposableMaterials.push(seaMat);

  // 3. Carved Beveled 3D Limestone Relief of Egypt
  const reliefGeo = buildEgyptReliefGeometry();
  const reliefMat = new THREE.MeshStandardMaterial({
    color: 0xd8c6ab,
    roughness: 0.62,
    metalness: 0.05,
  });
  const reliefMesh = new THREE.Mesh(reliefGeo, reliefMat);
  reliefMesh.position.set(0, 0.004, 0);
  maquetteRoot.add(reliefMesh);
  disposableGeometries.push(reliefGeo);
  disposableMaterials.push(reliefMat);

  // 4. Inlaid Amber-Gold Nile Valley & Delta Filaments
  const nileMat = new THREE.MeshStandardMaterial({
    color: 0xdfb160,
    emissive: 0x8f621c,
    emissiveIntensity: 0.55,
    roughness: 0.26,
    metalness: 0.68,
  });
  disposableMaterials.push(nileMat);
  for (const tubeGeo of buildNileFilamentGeometries()) {
    const tubeMesh = new THREE.Mesh(tubeGeo, nileMat);
    maquetteRoot.add(tubeMesh);
    disposableGeometries.push(tubeGeo);
  }

  // 5. Brushed-Brass Governorate Beacons (Flagship Alexandria taller on coast)
  const pinStemGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 10);
  const pinHeadGeo = new THREE.SphereGeometry(0.024, 12, 12);
  const pinRingGeo = new THREE.RingGeometry(0.032, 0.048, 20);
  const pinBrassMat = new THREE.MeshStandardMaterial({
    color: 0xe6b86a,
    emissive: 0x6e4a14,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.8,
  });
  const flagshipMat = new THREE.MeshStandardMaterial({
    color: 0xf6cf86,
    emissive: 0xb87c24,
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.85,
  });
  disposableGeometries.push(pinStemGeo, pinHeadGeo, pinRingGeo);
  disposableMaterials.push(pinBrassMat, flagshipMat);

  const surfaceTopY = RELIEF_DEPTH + 0.02;
  for (const pin of getMaquetteGovernoratePins()) {
    const stemHeight = pin.isFlagship ? 0.15 : 0.095;
    const mat = pin.isFlagship ? flagshipMat : pinBrassMat;

    const stem = new THREE.Mesh(pinStemGeo, mat);
    stem.scale.set(1, stemHeight, 1);
    stem.position.set(pin.x, surfaceTopY + stemHeight / 2, pin.z);
    maquetteRoot.add(stem);

    const head = new THREE.Mesh(pinHeadGeo, mat);
    const headScale = pin.isFlagship ? 1.32 : 1.0;
    head.scale.setScalar(headScale);
    head.position.set(pin.x, surfaceTopY + stemHeight, pin.z);
    maquetteRoot.add(head);

    const ring = new THREE.Mesh(pinRingGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pin.x, surfaceTopY + 0.002, pin.z);
    maquetteRoot.add(ring);
  }

  // 6. Rim-Anchored Leaning Consultant Figure
  let currentProgress = 0;
  let pointerNx = 0;
  let pointerNy = 0;
  let paused = false;
  let disposed = false;
  let pendingRaf: number | null = null;

  const scheduleRender = (): void => {
    if (disposed || paused || pendingRaf !== null) return;
    pendingRaf = window.requestAnimationFrame(() => {
      pendingRaf = null;
      renderScene();
    });
  };

  const consultantFigure = createConsultantFigure(scheduleRender);
  maquetteRoot.add(consultantFigure.group);

  const renderScene = (): void => {
    if (disposed) return;
    const pose = computeHeroCameraPose(currentProgress);
    const parallaxFactor = clamp01(1 - currentProgress * 1.4);

    camera.fov = pose.fov;
    camera.position.set(
      pose.position[0] + pointerNx * 0.055 * parallaxFactor,
      pose.position[1] + pointerNy * 0.028 * parallaxFactor,
      pose.position[2],
    );
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    camera.updateProjectionMatrix();

    consultantFigure.setParallax(pointerNx * parallaxFactor, pointerNy * parallaxFactor);
    consultantFigure.setFade(clamp01(1 - currentProgress / 0.58));

    renderer.render(scene, camera);
  };

  const onWebGLContextLost = (event: Event): void => {
    event.preventDefault();
    if (pendingRaf !== null) {
      window.cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }
    paused = true;
    options.onContextLost();
  };

  canvas.addEventListener('webglcontextlost', onWebGLContextLost, false);

  const disposeEngine = (): void => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('pagehide', disposeEngine);
    window.removeEventListener('beforeunload', disposeEngine);
    canvas.removeEventListener('webglcontextlost', onWebGLContextLost, false);
    if (pendingRaf !== null) {
      window.cancelAnimationFrame(pendingRaf);
      pendingRaf = null;
    }
    consultantFigure.dispose();
    for (const geo of disposableGeometries) geo.dispose();
    for (const mat of disposableMaterials) mat.dispose();
    try {
      renderer.forceContextLoss();
    } catch {
      // Ignore if context already lost
    }
    renderer.dispose();
  };

  window.addEventListener('pagehide', disposeEngine);
  window.addEventListener('beforeunload', disposeEngine);

  // Paint initial frame synchronously so canvas is immediately non-blank at mount
  renderScene();

  return {
    setProgress: (progress: number) => {
      const clamped = clamp01(progress);
      if (Math.abs(clamped - currentProgress) < 0.0005) return;
      currentProgress = clamped;
      if (clamped >= 1) {
        paused = true;
        if (pendingRaf !== null) {
          window.cancelAnimationFrame(pendingRaf);
          pendingRaf = null;
        }
        return;
      }
      if (!paused) {
        scheduleRender();
      }
    },
    setPointer: (nx: number, ny: number) => {
      pointerNx = Math.max(-1, Math.min(1, nx));
      pointerNy = Math.max(-1, Math.min(1, ny));
      scheduleRender();
    },
    setPaused: (nextPaused: boolean) => {
      if (paused === nextPaused) return;
      paused = nextPaused;
      if (paused && pendingRaf !== null) {
        window.cancelAnimationFrame(pendingRaf);
        pendingRaf = null;
      } else if (!paused) {
        renderScene();
      }
    },
    resize: (width: number, height: number) => {
      const safeW = Math.max(1, Math.round(width));
      const safeH = Math.max(1, Math.round(height));
      camera.aspect = safeW / safeH;
      camera.updateProjectionMatrix();
      renderer.setSize(safeW, safeH, false);
      if (!paused) {
        renderScene();
      }
    },
    renderNow: () => {
      renderScene();
    },
    dispose: () => {
      disposeEngine();
    },
  };
}
