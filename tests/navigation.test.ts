import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StationStop,
  RouteLeg,
  convertRoutePlanToLegs,
} from '@/src/types/navigation';
import {
  calculateDistanceToStop,
  evaluateGeofence,
  isOffRoute,
  checkApproachingDestination,
  processGpsTick,
} from '@/src/lib/navigationTracker';
import {
  VoiceNavigator,
  generateVoiceInstruction,
} from '@/src/lib/voiceNavigator';
import { RoutePlan } from '@/src/lib/transitEngine';
import { STATIONS } from '@/src/data/transitNetwork';

describe('Navigation Domain & Geofence Logic', () => {
  const monasStop: StationStop = {
    id: 'tj_monas',
    name: 'Halte Monumen Nasional',
    lat: -6.17612,
    lng: 106.82286,
  };

  const harmoniStop: StationStop = {
    id: 'tj_harmoni',
    name: 'Halte Harmoni',
    lat: -6.1662,
    lng: 106.82038,
  };

  it('calculates Haversine distance precisely between two coordinates', () => {
    const dist = calculateDistanceToStop(
      { lat: -6.17612, lng: 106.82286 },
      harmoniStop
    );
    // Distance Monas to Harmoni is ~1130 meters
    expect(dist).toBeGreaterThan(1000);
    expect(dist).toBeLessThan(1300);

    // Exact zero distance test
    const zeroDist = calculateDistanceToStop(
      { lat: -6.17612, lng: 106.82286 },
      monasStop
    );
    expect(zeroDist).toBeCloseTo(0, 1);
  });

  it('evaluates geofence thresholds: walk <= 25m, transit <= 80m', () => {
    // Walk threshold <= 25m
    expect(evaluateGeofence(20, 'WALK')).toBe(true);
    expect(evaluateGeofence(25, 'WALK')).toBe(true);
    expect(evaluateGeofence(26, 'WALK')).toBe(false);

    // Transit threshold <= 80m
    expect(evaluateGeofence(75, 'TRANSIT')).toBe(true);
    expect(evaluateGeofence(80, 'TRANSIT')).toBe(true);
    expect(evaluateGeofence(85, 'TRANSIT')).toBe(false);

    // Transfer threshold <= 80m
    expect(evaluateGeofence(50, 'TRANSFER')).toBe(true);
    expect(evaluateGeofence(81, 'TRANSFER')).toBe(false);
  });

  it('filters GPS drift: requires at least 2 consecutive stable ticks before completing leg', () => {
    const walkLeg: RouteLeg = {
      id: 'leg-1',
      type: 'WALK',
      from: { id: 'a', name: 'A', lat: -6.175, lng: 106.822 },
      to: monasStop,
      polylineCoordinates: [[-6.175, 106.822], [monasStop.lat, monasStop.lng]],
      distanceMeters: 100,
      durationMinutes: 2,
      status: 'active',
      instruction: 'Jalan kaki menuju Halte Monas',
    };

    // 1st tick inside geofence (15m from target) -> stableCount = 1, status remains active
    const tick1 = processGpsTick({
      currentLeg: walkLeg,
      userPos: { lat: monasStop.lat + 0.0001, lng: monasStop.lng }, // ~11m
      consecutiveInsideCount: 0,
    });
    expect(tick1.isCompleted).toBe(false);
    expect(tick1.newConsecutiveCount).toBe(1);

    // 2nd consecutive tick inside geofence -> triggers leg completion
    const tick2 = processGpsTick({
      currentLeg: walkLeg,
      userPos: { lat: monasStop.lat + 0.0001, lng: monasStop.lng },
      consecutiveInsideCount: tick1.newConsecutiveCount,
    });
    expect(tick2.isCompleted).toBe(true);
    expect(tick2.newConsecutiveCount).toBe(2);

    // If user drifts outside geofence (e.g. 50m away), consecutiveCount resets to 0
    const driftTick = processGpsTick({
      currentLeg: walkLeg,
      userPos: { lat: -6.18, lng: 106.83 }, // ~1000m away
      consecutiveInsideCount: 1,
    });
    expect(driftTick.isCompleted).toBe(false);
    expect(driftTick.newConsecutiveCount).toBe(0);
  });

  it('triggers Anti-Bablas approaching_destination alert at H-1 station before destination', () => {
    const transitLeg: RouteLeg = {
      id: 'leg-transit-cikarang',
      type: 'TRANSIT',
      mode: 'KRL',
      from: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2095, lng: 106.8494 },
      to: { id: 'krl_tanahabang', name: 'Stasiun Tanah Abang', lat: -6.1826, lng: 106.8106 },
      intermediateStops: [
        { id: 'krl_sudirman', name: 'Stasiun Sudirman', lat: -6.2026, lng: 106.8243 },
        { id: 'krl_karet', name: 'Stasiun Karet', lat: -6.2001, lng: 106.8175 }, // H-1 before Tanah Abang
      ],
      polylineCoordinates: [],
      distanceMeters: 5000,
      durationMinutes: 15,
      status: 'active',
      instruction: 'Naik KRL Lin Cikarang ke Tanah Abang',
    };

    // User is far from H-1
    const farResult = checkApproachingDestination(transitLeg, { lat: -6.2095, lng: 106.8494 });
    expect(farResult.isApproaching).toBe(false);

    // User arrives within 80m of Stasiun Karet (H-1 station)
    const karetPos = { lat: -6.2001, lng: 106.8175 };
    const alertResult = checkApproachingDestination(transitLeg, karetPos);
    expect(alertResult.isApproaching).toBe(true);
    expect(alertResult.nextStationName).toBe('Stasiun Tanah Abang');
  });

  it('detects off-route condition when user is > 100m from polyline path', () => {
    const polyline: [number, number][] = [
      [-6.170, 106.820],
      [-6.175, 106.820],
      [-6.180, 106.820],
    ];

    // User is 10 meters away from segment
    const onRoute = isOffRoute({ lat: -6.175, lng: 106.8201 }, polyline, 100);
    expect(onRoute).toBe(false);

    // User is 300 meters off path
    const offRoute = isOffRoute({ lat: -6.175, lng: 106.8235 }, polyline, 100);
    expect(offRoute).toBe(true);
  });
});

describe('convertRoutePlanToLegs Converter', () => {
  it('converts a full door-to-door RoutePlan with first & last mile walk into structured RouteLegs', () => {
    const mockOrigin = STATIONS[0];
    const mockDest = STATIONS[1];

    const mockPlan: RoutePlan = {
      origin: mockOrigin,
      destination: mockDest,
      firstMileWalk: {
        fromName: 'Rumah',
        toName: mockOrigin.name,
        fromCoords: [-6.2, 106.8],
        toCoords: mockOrigin.coords,
        distanceMeters: 250,
        distanceKm: 0.25,
        durationMinutes: 4,
        polylineCoords: [[-6.2, 106.8], mockOrigin.coords],
        instruction: `Jalan kaki 250m ke ${mockOrigin.name}`,
      },
      segments: [
        {
          id: 'seg-1',
          lineId: 'krl-cikarang',
          lineName: 'Lin Cikarang',
          lineColor: '#0072C6',
          type: 'krl',
          fromStation: mockOrigin,
          toStation: mockDest,
          stops: [mockOrigin, mockDest],
          stopCount: 2,
          distanceKm: 4.5,
          durationMinutes: 10,
          fareIdr: 3000,
          instruction: 'Naik KRL Lin Cikarang',
          polylineCoords: [mockOrigin.coords, mockDest.coords],
        },
      ],
      lastMileWalk: {
        fromName: mockDest.name,
        toName: 'Kantor',
        fromCoords: mockDest.coords,
        toCoords: [-6.18, 106.81],
        distanceMeters: 180,
        distanceKm: 0.18,
        durationMinutes: 3,
        polylineCoords: [mockDest.coords, [-6.18, 106.81]],
        instruction: 'Jalan kaki 180m ke Kantor',
      },
      allStops: [mockOrigin, mockDest],
      totalDistanceKm: 4.93,
      totalDurationMinutes: 17,
      totalFareIdr: 3000,
      polylineCoords: [mockOrigin.coords, mockDest.coords],
    };

    const legs = convertRoutePlanToLegs(mockPlan);
    expect(legs.length).toBe(3); // first-mile walk + transit + last-mile walk
    expect(legs[0].type).toBe('WALK');
    expect(legs[0].status).toBe('active');
    expect(legs[1].type).toBe('TRANSIT');
    expect(legs[1].mode).toBe('KRL');
    expect(legs[1].status).toBe('upcoming');
    expect(legs[2].type).toBe('WALK');
    expect(legs[2].status).toBe('upcoming');
  });
});

describe('Voice Guidance Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates standard Indonesian commuter instructions', () => {
    const walkInstruction = generateVoiceInstruction({
      type: 'START_WALK',
      distanceMeters: 150,
      targetName: 'Peron 1 Stasiun Manggarai',
    });
    expect(walkInstruction).toBe('Mulai perjalanan. Jalan kaki 150 meter menuju Peron 1 Stasiun Manggarai.');

    const gateInstruction = generateVoiceInstruction({
      type: 'APPROACH_GATE',
      distanceMeters: 50,
    });
    expect(gateInstruction).toBe('Dalam 50 meter, bersiap tap in di gerbang masuk.');

    const transitInstruction = generateVoiceInstruction({
      type: 'TRANSIT_BOARD',
      stationName: 'Stasiun Duri',
      mode: 'KRL',
      destinationName: 'Stasiun Tangerang',
    });
    expect(transitInstruction).toBe('Kamu sudah berada di Stasiun Duri. Naik KRL arah Stasiun Tangerang.');

    const antiBablasInstruction = generateVoiceInstruction({
      type: 'ANTI_BABLAS_WARNING',
      stationName: 'Stasiun Juanda',
    });
    expect(antiBablasInstruction).toBe('Peringatan, satu stasiun lagi tiba di stasiun tujuanmu, Stasiun Juanda. Bersiap di dekat pintu.');

    const arrivedInstruction = generateVoiceInstruction({
      type: 'ARRIVED',
    });
    expect(arrivedInstruction).toBe('Kamu telah sampai di tujuan. Navigasi selesai.');
  });

  it('mocks speechSynthesis and speaks Indonesian utterances with anti-spam deduplication', () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = 'id-ID';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    (globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      MockSpeechSynthesisUtterance;

    // Mock window.speechSynthesis
    const fakeSpeechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: vi.fn().mockReturnValue([
        { lang: 'id-ID', name: 'Indonesian Female', default: true },
        { lang: 'en-US', name: 'English', default: false },
      ]),
      onvoiceschanged: null,
      speaking: false,
    };

    const navigator = new VoiceNavigator(fakeSpeechSynthesis as unknown as SpeechSynthesis);

    // 1st speak call
    navigator.speakOnce('key-start', 'Mulai perjalanan. Jalan kaki 150 meter menuju peron.');
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    // 2nd identical speak call with same key -> should be suppressed by anti-spam deduplication
    navigator.speakOnce('key-start', 'Mulai perjalanan. Jalan kaki 150 meter menuju peron.');
    expect(mockSpeak).toHaveBeenCalledTimes(1);

    // Priority speak call cancels previous utterance
    navigator.speakPriority('Peringatan, satu stasiun lagi tiba di stasiun tujuanmu.');
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('is SSR-safe and does not throw when window is undefined', () => {
    const ssrNavigator = new VoiceNavigator(null);
    expect(() => ssrNavigator.speak('Test')).not.toThrow();
    expect(() => ssrNavigator.unlockAudio()).not.toThrow();
  });

  it('safely handles null, empty, or fallback route plans without throwing', () => {
    // Null plan
    expect(convertRoutePlanToLegs(null as unknown as RoutePlan)).toEqual([]);

    // Minimal fallback plan
    const mockOrigin = STATIONS[0];
    const mockDest = STATIONS[1];
    const emptySegmentsPlan: RoutePlan = {
      origin: mockOrigin,
      destination: mockDest,
      segments: [],
      allStops: [mockOrigin, mockDest],
      totalDistanceKm: 5,
      totalDurationMinutes: 15,
      totalFareIdr: 3000,
      polylineCoords: [mockOrigin.coords, mockDest.coords],
    };

    const legs = convertRoutePlanToLegs(emptySegmentsPlan);
    expect(legs.length).toBe(1);
    expect(legs[0].status).toBe('active');
    expect(legs[0].from.name).toBe(mockOrigin.name);
    expect(legs[0].to.name).toBe(mockDest.name);
  });

  it('correctly maps transfer steps between segments into TRANSFER legs', () => {
    const mockOrigin = STATIONS[0];
    const mockTransit = STATIONS[1];
    const mockDest = STATIONS[2];

    const transferPlan: RoutePlan = {
      origin: mockOrigin,
      destination: mockDest,
      segments: [
        {
          id: 'seg-1',
          lineId: 'krl-cikarang',
          lineName: 'Lin Cikarang',
          lineColor: '#0072C6',
          type: 'krl',
          fromStation: mockOrigin,
          toStation: mockTransit,
          stops: [mockOrigin, mockTransit],
          stopCount: 2,
          distanceKm: 3,
          durationMinutes: 8,
          fareIdr: 3000,
          instruction: 'Naik KRL ke transit',
          polylineCoords: [mockOrigin.coords, mockTransit.coords],
        },
        {
          id: 'seg-2',
          lineId: 'krl-bogor',
          lineName: 'Lin Bogor',
          lineColor: '#E11B22',
          type: 'krl',
          fromStation: mockTransit,
          toStation: mockDest,
          stops: [mockTransit, mockDest],
          stopCount: 2,
          distanceKm: 4,
          durationMinutes: 10,
          fareIdr: 3000,
          instruction: 'Naik KRL ke tujuan',
          polylineCoords: [mockTransit.coords, mockDest.coords],
        },
      ],
      transfers: [
        {
          fromStation: mockTransit,
          toStation: mockTransit,
          walkMinutes: 3,
          instruction: `Pindah peron di ${mockTransit.name}`,
        },
      ],
      allStops: [mockOrigin, mockTransit, mockDest],
      totalDistanceKm: 7,
      totalDurationMinutes: 21,
      totalFareIdr: 3000,
      polylineCoords: [mockOrigin.coords, mockTransit.coords, mockDest.coords],
    };

    const legs = convertRoutePlanToLegs(transferPlan);
    expect(legs.length).toBe(3); // seg1 + transfer + seg2
    expect(legs[0].type).toBe('TRANSIT');
    expect(legs[0].status).toBe('active');
    expect(legs[1].type).toBe('TRANSFER');
    expect(legs[1].status).toBe('upcoming');
    expect(legs[2].type).toBe('TRANSIT');
    expect(legs[2].status).toBe('upcoming');
  });
});

