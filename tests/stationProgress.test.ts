import { describe, it, expect } from 'vitest';
import {
  extractRouteStations,
  computeStationProgress,
  StationProgressItem,
} from '@/src/lib/stationProgress';
import { RouteLeg } from '@/src/types/navigation';

describe('Station Progress Domain Engine (Pure Functions)', () => {
  const sampleLegs: RouteLeg[] = [
    {
      id: 'leg-walk-1',
      type: 'WALK',
      from: { id: 'origin_place', name: 'Lokasi Saya', lat: -6.22, lng: 106.85 },
      to: { id: 'krl_tebet', name: 'Stasiun Tebet', lat: -6.2263, lng: 106.8582 },
      polylineCoordinates: [[-6.22, 106.85], [-6.2263, 106.8582]],
      distanceMeters: 500,
      durationMinutes: 6,
      status: 'upcoming',
      instruction: 'Jalan ke Stasiun Tebet',
    },
    {
      id: 'leg-krl-bogor',
      type: 'TRANSIT',
      mode: 'KRL',
      lineName: 'Lin Bogor',
      lineColor: '#e11d48',
      from: { id: 'krl_tebet', name: 'Stasiun Tebet', lat: -6.2263, lng: 106.8582 },
      intermediateStops: [
        { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lng: 106.8501 },
        { id: 'krl_cikini', name: 'Stasiun Cikini', lat: -6.1983, lng: 106.8415 },
        { id: 'krl_gondangdia', name: 'Stasiun Gondangdia', lat: -6.1863, lng: 106.8327 },
      ],
      to: { id: 'krl_juanda', name: 'Stasiun Juanda', lat: -6.1666, lng: 106.8306 },
      polylineCoordinates: [
        [-6.2263, 106.8582],
        [-6.2099, 106.8501],
        [-6.1983, 106.8415],
        [-6.1863, 106.8327],
        [-6.1666, 106.8306],
      ],
      distanceMeters: 8000,
      durationMinutes: 18,
      status: 'upcoming',
      instruction: 'Naik KRL Lin Bogor menuju Stasiun Juanda',
    },
  ];

  it('extracts all unique stations in order and sets origin/destination flags', () => {
    const stations = extractRouteStations(sampleLegs);

    expect(stations.length).toBe(5);
    expect(stations[0].name).toBe('Stasiun Tebet');
    expect(stations[0].isOrigin).toBe(true);
    expect(stations[0].isDestination).toBe(false);

    expect(stations[1].name).toBe('Stasiun Manggarai');
    expect(stations[2].name).toBe('Stasiun Cikini');
    expect(stations[3].name).toBe('Stasiun Gondangdia');

    expect(stations[4].name).toBe('Stasiun Juanda');
    expect(stations[4].isDestination).toBe(true);
    expect(stations[4].isOrigin).toBe(false);
  });

  it('handles multi-leg route with transfer and deduplicates interchange station', () => {
    const multiLegsWithTransfer: RouteLeg[] = [
      {
        id: 'leg-cikarang',
        type: 'TRANSIT',
        mode: 'KRL',
        lineName: 'Lin Cikarang',
        lineColor: '#0284c7',
        from: { id: 'krl_bekasi', name: 'Stasiun Bekasi', lat: -6.2361, lng: 106.9996 },
        to: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lng: 106.8501 },
        polylineCoordinates: [[-6.2361, 106.9996], [-6.2099, 106.8501]],
        distanceMeters: 15000,
        durationMinutes: 25,
        status: 'upcoming',
        instruction: 'Naik KRL Cikarang ke Manggarai',
      },
      {
        id: 'leg-transfer',
        type: 'TRANSFER',
        from: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lng: 106.8501 },
        to: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lng: 106.8501 },
        polylineCoordinates: [[-6.2099, 106.8501], [-6.2099, 106.8501]],
        distanceMeters: 50,
        durationMinutes: 3,
        status: 'upcoming',
        instruction: 'Pindah peron ke Lin Bogor',
      },
      {
        id: 'leg-bogor',
        type: 'TRANSIT',
        mode: 'KRL',
        lineName: 'Lin Bogor',
        lineColor: '#e11d48',
        from: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2099, lng: 106.8501 },
        to: { id: 'krl_juanda', name: 'Stasiun Juanda', lat: -6.1666, lng: 106.8306 },
        polylineCoordinates: [[-6.2099, 106.8501], [-6.1666, 106.8306]],
        distanceMeters: 6000,
        durationMinutes: 12,
        status: 'upcoming',
        instruction: 'Naik KRL Lin Bogor ke Juanda',
      },
    ];

    const stations = extractRouteStations(multiLegsWithTransfer);

    // Should have Bekasi, Manggarai (with isTransfer = true), Juanda
    expect(stations.length).toBe(3);
    expect(stations[0].name).toBe('Stasiun Bekasi');
    expect(stations[1].name).toBe('Stasiun Manggarai');
    expect(stations[1].isTransfer).toBe(true);
    expect(stations[2].name).toBe('Stasiun Juanda');
  });

  it('computes initial progress correctly when user has not moved yet', () => {
    const progress = computeStationProgress({
      legs: sampleLegs,
      currentLegIndex: 1, // KRL leg
      userPos: null,
    });

    expect(progress.totalStations).toBe(5);
    expect(progress.passedCount).toBe(0);
    expect(progress.remainingCount).toBe(4);
    expect(progress.currentStation?.name).toBe('Stasiun Tebet');
    expect(progress.nextStation?.name).toBe('Stasiun Manggarai');
    expect(progress.progressPercent).toBe(0);
  });

  it('marks passed, current, and upcoming stations when user is at Cikini', () => {
    // User is within 30m of Stasiun Cikini (-6.1983, 106.8415)
    const progress = computeStationProgress({
      legs: sampleLegs,
      currentLegIndex: 1,
      userPos: { lat: -6.19835, lng: 106.84155 },
    });

    expect(progress.currentStation?.name).toBe('Stasiun Cikini');
    expect(progress.currentStation?.status).toBe('current');

    // Tebet and Manggarai should be passed
    const tebet = progress.items.find((s) => s.name === 'Stasiun Tebet');
    const manggarai = progress.items.find((s) => s.name === 'Stasiun Manggarai');
    expect(tebet?.status).toBe('passed');
    expect(manggarai?.status).toBe('passed');

    // Gondangdia and Juanda should be upcoming
    const gondangdia = progress.items.find((s) => s.name === 'Stasiun Gondangdia');
    const juanda = progress.items.find((s) => s.name === 'Stasiun Juanda');
    expect(gondangdia?.status).toBe('upcoming');
    expect(juanda?.status).toBe('upcoming');

    expect(progress.passedCount).toBe(2);
    expect(progress.remainingCount).toBe(2);
    expect(progress.progressPercent).toBe(50); // 2 out of 4 intervals = 50%
  });

  it('marks all previous stations as passed when user arrives at final destination', () => {
    // User is at Stasiun Juanda (-6.1666, 106.8306)
    const progress = computeStationProgress({
      legs: sampleLegs,
      currentLegIndex: 1,
      userPos: { lat: -6.1666, lng: 106.8306 },
    });

    expect(progress.currentStation?.name).toBe('Stasiun Juanda');
    expect(progress.passedCount).toBe(4);
    expect(progress.remainingCount).toBe(0);
    expect(progress.progressPercent).toBe(100);
  });

  it('handles empty legs gracefully', () => {
    const progress = computeStationProgress({
      legs: [],
      currentLegIndex: 0,
      userPos: null,
    });

    expect(progress.totalStations).toBe(0);
    expect(progress.items).toEqual([]);
    expect(progress.currentStation).toBeNull();
    expect(progress.progressPercent).toBe(0);
  });
});
