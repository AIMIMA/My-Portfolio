import * as THREE from 'three';
import { ACTIVE_GOVERNORATES, EGYPT_NILE_PATHS, EGYPT_OUTLINE_RING } from '../data';
import type { LngLatTuple } from '../types/portfolio';
import { projectEgyptToMaquette } from '../utils/mercator';

export const MAQUETTE_HALF_SPAN = 1.05;
export const RELIEF_DEPTH = 0.068;

export interface GovernoratePin3D {
  id: string;
  isFlagship: boolean;
  x: number;
  z: number;
}

/**
 * Builds the carved beveled 3D limestone relief geometry of Egypt directly from
 * `EGYPT_OUTLINE_RING` via conformal Web Mercator (`projectEgyptToMaquette`),
 * guaranteeing exact 1:1 optical alignment with MapLibre GL JS during the dive.
 */
export function buildEgyptReliefGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();

  EGYPT_OUTLINE_RING.forEach(([lng, lat], idx) => {
    const { x, z } = projectEgyptToMaquette(lat, lng, MAQUETTE_HALF_SPAN);
    // Shape is extruded in +Z then rotated -90deg around X: (x, y_shape, z_ext) -> (x, z_ext, -y_shape)
    const sx = x;
    const sy = -z;
    if (idx === 0) {
      shape.moveTo(sx, sy);
    } else {
      shape.lineTo(sx, sy);
    }
  });
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: RELIEF_DEPTH,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.014,
    bevelThickness: 0.014,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function buildNileCurve(points: readonly LngLatTuple[], yOffset: number): THREE.CatmullRomCurve3 {
  const vectors = points.map(([lng, lat]) => {
    const { x, z } = projectEgyptToMaquette(lat, lng, MAQUETTE_HALF_SPAN);
    return new THREE.Vector3(x, yOffset, z);
  });
  return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.35);
}

/**
 * Builds inlaid amber-gold Nile Valley & Delta filament tube geometries atop the relief.
 */
export function buildNileFilamentGeometries(): THREE.TubeGeometry[] {
  const surfaceY = RELIEF_DEPTH + 0.017;
  const mainCurve = buildNileCurve(EGYPT_NILE_PATHS.main, surfaceY);
  const rosettaCurve = buildNileCurve(EGYPT_NILE_PATHS.rosetta, surfaceY);
  const damiettaCurve = buildNileCurve(EGYPT_NILE_PATHS.damietta, surfaceY);

  return [
    new THREE.TubeGeometry(mainCurve, 44, 0.009, 6, false),
    new THREE.TubeGeometry(rosettaCurve, 18, 0.006, 6, false),
    new THREE.TubeGeometry(damiettaCurve, 18, 0.006, 6, false),
  ];
}

/**
 * Computes maquette-space coordinates for all 6 active Egyptian governorates.
 */
export function getMaquetteGovernoratePins(): GovernoratePin3D[] {
  return ACTIVE_GOVERNORATES.map((gov) => {
    const { x, z } = projectEgyptToMaquette(gov.center.lat, gov.center.lng, MAQUETTE_HALF_SPAN);
    return {
      id: gov.id,
      isFlagship: gov.isFlagship,
      x,
      z,
    };
  });
}
