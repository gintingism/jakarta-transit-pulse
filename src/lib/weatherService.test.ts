import { describe, it, expect } from 'vitest';
import { interpretWmoWeatherCode } from './weatherService';

describe('weatherService (Open-Meteo Transit Weather)', () => {
  it('correctly maps clear sky WMO code 0', () => {
    const result = interpretWmoWeatherCode(0);
    expect(result.conditionText).toBe('Cerah');
    expect(result.isRaining).toBe(false);
    expect(result.icon).toBe('☀️');
  });

  it('correctly maps cloudy sky WMO codes 1-3', () => {
    const result1 = interpretWmoWeatherCode(1);
    expect(result1.conditionText).toBe('Cerah Berawan');
    expect(result1.isRaining).toBe(false);

    const result2 = interpretWmoWeatherCode(2);
    expect(result2.conditionText).toBe('Berawan Sebagian');

    const result3 = interpretWmoWeatherCode(3);
    expect(result3.conditionText).toBe('Berawan Mendung');
  });

  it('correctly identifies drizzle and slight rain with rain warning', () => {
    const drizzle = interpretWmoWeatherCode(51);
    expect(drizzle.isRaining).toBe(true);
    expect(drizzle.conditionText).toBe('Gerimis Ringan');
    expect(drizzle.advisoryText).toContain('payung');

    const slightRain = interpretWmoWeatherCode(61);
    expect(slightRain.isRaining).toBe(true);
    expect(slightRain.conditionText).toBe('Hujan Ringan');
  });

  it('correctly flags thunderstorm code 95 with flood caution', () => {
    const storm = interpretWmoWeatherCode(95);
    expect(storm.isRaining).toBe(true);
    expect(storm.conditionText).toBe('Badai Petir');
    expect(storm.advisoryText).toContain('genangan');
  });
});
