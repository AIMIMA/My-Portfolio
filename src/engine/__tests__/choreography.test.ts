import { describe, expect, it } from 'vitest';
import {
  clamp01,
  computeEgyptBlend,
  computeHeroCameraPose,
  easeInOutCubic,
} from '../choreography';
import { getMaquetteGovernoratePins } from '../egyptReliefGeometry';

describe('choreography spline & optical blend', () => {
  it('clamps out-of-range and non-finite inputs safely', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('transitions camera smoothly from studio angle to overhead zenith at p >= 0.88', () => {
    const start = computeHeroCameraPose(0);
    const mid = computeHeroCameraPose(0.44);
    const zenith = computeHeroCameraPose(0.95);

    expect(start.position[2]).toBeGreaterThan(2);
    expect(mid.position[1]).toBeGreaterThan(start.position[1]);
    expect(Math.abs(zenith.position[0])).toBeLessThan(1e-6);
    expect(zenith.position[2]).toBeCloseTo(0.001, 4);
    expect(zenith.target).toEqual([0, 0, 0]);
  });

  it('cross-dissolves hero and map opacities monotonically across [0..1]', () => {
    const b0 = computeEgyptBlend(0);
    expect(b0.heroOpacity).toBe(1);
    expect(b0.mapOpacity).toBe(0);
    expect(b0.overlayOpacity).toBe(1);
    expect(b0.heroInteractive).toBe(true);

    const bMid = computeEgyptBlend(0.7);
    expect(bMid.heroOpacity).toBeGreaterThan(0);
    expect(bMid.heroOpacity).toBeLessThan(1);
    expect(bMid.mapOpacity).toBeGreaterThan(0);
    expect(bMid.overlayOpacity).toBe(0);

    const bEnd = computeEgyptBlend(1);
    expect(bEnd.heroOpacity).toBe(0);
    expect(bEnd.mapOpacity).toBe(1);
    expect(bEnd.heroInteractive).toBe(false);
  });

  it('projects all 6 active governorate pins with Alexandria flagged as flagship', () => {
    const pins = getMaquetteGovernoratePins();
    expect(pins).toHaveLength(6);
    const alex = pins.find((p) => p.id === 'alexandria');
    expect(alex?.isFlagship).toBe(true);
    // Alexandria lies on the northern Mediterranean rim (-Z in maquette space)
    expect(alex?.z).toBeLessThan(0);
  });
});
