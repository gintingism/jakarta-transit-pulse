import { describe, it, expect } from 'vitest';
import { findNearestBmkgAdm4 } from './bmkgAreaMap';

describe('findNearestBmkgAdm4', () => {
  it('returns Gambir adm4 for Gambir station coords', () => {
    // Gambir KRL station: -6.1764, 106.8267
    const adm4 = findNearestBmkgAdm4(-6.1764, 106.8267);
    expect(adm4).toBe('31.71.01.1001');
  });

  it('returns Kebayoran Baru adm4 for Blok M MRT coords', () => {
    // MRT Blok M / Blok M Bus Terminal: -6.244, 106.799
    const adm4 = findNearestBmkgAdm4(-6.244, 106.799);
    expect(adm4).toBe('31.74.05.1002');
  });

  it('returns Jatinegara adm4 for Jatinegara station coords', () => {
    // Jatinegara KRL: -6.215, 106.876
    const adm4 = findNearestBmkgAdm4(-6.215, 106.876);
    expect(adm4).toBe('31.75.04.1002');
  });

  it('returns Cengkareng adm4 for Soekarno-Hatta airport area', () => {
    // Soekarno-Hatta: -6.125, 106.655
    const adm4 = findNearestBmkgAdm4(-6.125, 106.655);
    expect(adm4).toBe('31.73.08.1001');
  });

  it('returns a valid adm4 format (XX.YY.ZZ.WWWW) for any coordinate', () => {
    const adm4 = findNearestBmkgAdm4(-6.2, 106.82);
    expect(adm4).toMatch(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/);
  });
});
