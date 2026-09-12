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
  projectPointToPolyline,
  evaluateAdaptiveStep,
  evaluateOffRoute,
} from '@/src/lib/navigationTracker';
import {
  VoiceNavigator,
  generateVoiceInstruction,
  getVoiceNavigator,
  resetSharedVoiceNavigator,
} from '@/src/lib/voiceNavigator';
import { BackgroundKeepAliveManager } from '@/src/lib/backgroundKeepAlive';
import { RoutePlan } from '@/src/lib/transitEngine';
import { STATIONS } from '@/src/data/transitNetwork';
import { useTransitStore } from '@/stores/useTransitStore';

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

  it('evaluates geofence thresholds: walk <= 40m/75m, transit/transfer <= 80m', () => {
    // Walk threshold (street destination <= 40m, station stop <= 75m)
    expect(evaluateGeofence(35, 'WALK', false)).toBe(true);
    expect(evaluateGeofence(40, 'WALK', false)).toBe(true);
    expect(evaluateGeofence(45, 'WALK', false)).toBe(false);

    expect(evaluateGeofence(70, 'WALK', true)).toBe(true);
    expect(evaluateGeofence(75, 'WALK', true)).toBe(true);
    expect(evaluateGeofence(80, 'WALK', true)).toBe(false);

    // Transit threshold <= 80m
    expect(evaluateGeofence(75, 'TRANSIT')).toBe(true);
    expect(evaluateGeofence(80, 'TRANSIT')).toBe(true);
    expect(evaluateGeofence(85, 'TRANSIT')).toBe(false);

    // Transfer threshold <= 80m
    expect(evaluateGeofence(50, 'TRANSFER')).toBe(true);
    expect(evaluateGeofence(80, 'TRANSFER')).toBe(true);
    expect(evaluateGeofence(85, 'TRANSFER')).toBe(false);
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

  describe('Snap-to-Route & Polyline Projection', () => {
    const polyline: [number, number][] = [
      [-6.170, 106.820],
      [-6.175, 106.820],
      [-6.180, 106.820],
    ];

    it('projects point perpendicularly onto the nearest polyline segment', () => {
      // Point is ~50 meters east of the middle segment
      const projection = projectPointToPolyline({ lat: -6.175, lng: 106.82045 }, polyline);
      expect(projection).not.toBeNull();
      expect(projection!.distanceMeters).toBeGreaterThan(40);
      expect(projection!.distanceMeters).toBeLessThan(60);
      expect(projection!.projectedPoint[0]).toBeCloseTo(-6.175, 3);
      expect(projection!.projectedPoint[1]).toBeCloseTo(106.820, 3);
    });

    it('handles point beyond polyline endpoints with edge clamping', () => {
      // Point is north of the first point
      const projection = projectPointToPolyline({ lat: -6.165, lng: 106.820 }, polyline);
      expect(projection).not.toBeNull();
      expect(projection!.projectedPoint[0]).toBeCloseTo(-6.170, 3);
      expect(projection!.segmentIndex).toBe(0);
      expect(projection!.fraction).toBe(0);
    });
  });

  describe('Dynamic Step Auto-Advance (Lookahead)', () => {
    const leg0Walk: RouteLeg = {
      id: 'leg-walk-origin',
      type: 'WALK',
      from: { id: 'home', name: 'Rumah', lat: -6.210, lng: 106.840 },
      to: { id: 'krl_sudirman', name: 'Stasiun Sudirman', lat: -6.2026, lng: 106.8243 },
      polylineCoordinates: [
        [-6.210, 106.840],
        [-6.205, 106.830],
        [-6.2026, 106.8243],
      ],
      distanceMeters: 800,
      durationMinutes: 10,
      status: 'active',
      instruction: 'Jalan kaki ke Stasiun Sudirman',
    };

    const leg1Transit: RouteLeg = {
      id: 'leg-krl-cikarang',
      type: 'TRANSIT',
      mode: 'KRL',
      from: { id: 'krl_sudirman', name: 'Stasiun Sudirman', lat: -6.2026, lng: 106.8243 },
      to: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2095, lng: 106.8494 },
      polylineCoordinates: [
        [-6.2026, 106.8243],
        [-6.2050, 106.8350],
        [-6.2095, 106.8494],
      ],
      distanceMeters: 3200,
      durationMinutes: 8,
      status: 'upcoming',
      instruction: 'Naik KRL ke Manggarai',
    };

    const leg2Walk: RouteLeg = {
      id: 'leg-walk-destination',
      type: 'WALK',
      from: { id: 'krl_manggarai', name: 'Stasiun Manggarai', lat: -6.2095, lng: 106.8494 },
      to: { id: 'office', name: 'Kantor', lat: -6.2120, lng: 106.8520 },
      polylineCoordinates: [
        [-6.2095, 106.8494],
        [-6.2120, 106.8520],
      ],
      distanceMeters: 300,
      durationMinutes: 4,
      status: 'upcoming',
      instruction: 'Jalan kaki ke Kantor',
    };

    const testLegs = [leg0Walk, leg1Transit, leg2Walk];

    it('advances normally when user completes leg 0 target with 2 stable ticks', () => {
      const sudirmanPos = { lat: -6.2026, lng: 106.8243 };

      const tick1 = evaluateAdaptiveStep({
        legs: testLegs,
        currentLegIndex: 0,
        userPos: sudirmanPos,
        consecutiveInsideCount: 0,
      });
      expect(tick1.nextLegIndex).toBe(0);
      expect(tick1.isCompleted).toBe(false);
      expect(tick1.newConsecutiveCount).toBe(1);

      const tick2 = evaluateAdaptiveStep({
        legs: testLegs,
        currentLegIndex: 0,
        userPos: sudirmanPos,
        consecutiveInsideCount: 1,
      });
      expect(tick2.nextLegIndex).toBe(1);
      expect(tick2.isCompleted).toBe(true);
      expect(tick2.newConsecutiveCount).toBe(0);
    });

    it('auto-advances with lookahead when user bypassed walk and is already on transit line', () => {
      // User is halfway on transit line (between Sudirman and Manggarai), 1.5 km away from Sudirman
      const midwayTransitPos = { lat: -6.2050, lng: 106.8350 };

      const result = evaluateAdaptiveStep({
        legs: testLegs,
        currentLegIndex: 0, // was still at walk step
        userPos: midwayTransitPos,
        consecutiveInsideCount: 0,
      });

      // Should automatically look ahead and advance to leg 1 (Transit)
      expect(result.nextLegIndex).toBe(1);
      expect(result.isAdvancedByLookahead).toBe(true);
    });

    it('auto-advances to final walk if user is already at destination of transit leg', () => {
      // User is already at Manggarai
      const manggaraiPos = { lat: -6.2095, lng: 106.8494 };

      const result = evaluateAdaptiveStep({
        legs: testLegs,
        currentLegIndex: 0,
        userPos: manggaraiPos,
        consecutiveInsideCount: 0,
      });

      // Should advance past leg 0 and leg 1 directly to leg 2 (Walk to Office)
      expect(result.nextLegIndex).toBe(2);
      expect(result.isAdvancedByLookahead).toBe(true);
    });
  });

  describe('Snap-to-Route & Multi-Tick Off-Route Filter', () => {
    const filterLegs: RouteLeg[] = [
      {
        id: 'leg-1',
        type: 'TRANSIT',
        from: { id: 's1', name: 'S1', lat: -6.170, lng: 106.820 },
        to: { id: 's2', name: 'S2', lat: -6.180, lng: 106.820 },
        polylineCoordinates: [
          [-6.170, 106.820],
          [-6.180, 106.820],
        ],
        distanceMeters: 1000,
        durationMinutes: 3,
        status: 'active',
        instruction: 'Naik kereta',
      },
      {
        id: 'leg-2',
        type: 'TRANSIT',
        from: { id: 's2', name: 'S2', lat: -6.180, lng: 106.820 },
        to: { id: 's3', name: 'S3', lat: -6.190, lng: 106.820 },
        polylineCoordinates: [
          [-6.180, 106.820],
          [-6.190, 106.820],
        ],
        distanceMeters: 1000,
        durationMinutes: 3,
        status: 'upcoming',
        instruction: 'Lanjut kereta',
      },
    ];

    it('does not trigger off-route on single GPS jitter spike (requires >= 3 ticks)', () => {
      // 1st tick far off (~220m east)
      const tick1 = evaluateOffRoute({
        legs: filterLegs,
        activeLegIndex: 0,
        userPos: { lat: -6.175, lng: 106.822 },
        consecutiveOffRouteCount: 0,
      });
      expect(tick1.isOffRoute).toBe(false);
      expect(tick1.newConsecutiveOffRouteCount).toBe(1);

      // 2nd tick far off
      const tick2 = evaluateOffRoute({
        legs: filterLegs,
        activeLegIndex: 0,
        userPos: { lat: -6.175, lng: 106.822 },
        consecutiveOffRouteCount: tick1.newConsecutiveOffRouteCount,
      });
      expect(tick2.isOffRoute).toBe(false);
      expect(tick2.newConsecutiveOffRouteCount).toBe(2);

      // 3rd consecutive tick far off -> triggers off-route alert
      const tick3 = evaluateOffRoute({
        legs: filterLegs,
        activeLegIndex: 0,
        userPos: { lat: -6.175, lng: 106.822 },
        consecutiveOffRouteCount: tick2.newConsecutiveOffRouteCount,
      });
      expect(tick3.isOffRoute).toBe(true);
      expect(tick3.newConsecutiveOffRouteCount).toBe(3);

      // Recovers on next tick -> immediately clears off-route
      const recoveryTick = evaluateOffRoute({
        legs: filterLegs,
        activeLegIndex: 0,
        userPos: { lat: -6.175, lng: 106.8201 }, // ~11m
        consecutiveOffRouteCount: 3,
      });
      expect(recoveryTick.isOffRoute).toBe(false);
      expect(recoveryTick.newConsecutiveOffRouteCount).toBe(0);
    });

    it('does not trigger off-route if user is near a future remaining leg', () => {
      // User is on leg 0, but position is near leg 2's polyline
      const result = evaluateOffRoute({
        legs: filterLegs,
        activeLegIndex: 0,
        userPos: { lat: -6.185, lng: 106.8201 }, // On leg 2
        consecutiveOffRouteCount: 2,
      });
      expect(result.isOffRoute).toBe(false);
      expect(result.newConsecutiveOffRouteCount).toBe(0);
    });
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

    // speakLatest cancels prior speech and speaks latest instruction
    navigator.speakLatest('key-next', 'Lanjut naik bus ke halte Monas.');
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenCalledTimes(3);
  });

  it('is SSR-safe and does not throw when window is undefined', () => {
    const ssrNavigator = new VoiceNavigator(null);
    expect(() => ssrNavigator.speak('Test')).not.toThrow();
    expect(() => ssrNavigator.unlockAudio()).not.toThrow();
  });

  it('gracefully falls back to default voice if no id-ID voice exists on device', () => {
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();
    const englishVoice = { lang: 'en-US', name: 'English David', default: true };
    const frenchVoice = { lang: 'fr-FR', name: 'French Hortense', default: false };

    const fakeSpeechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: vi.fn().mockReturnValue([englishVoice, frenchVoice]),
      onvoiceschanged: null,
      speaking: false,
    };

    const navigator = new VoiceNavigator(fakeSpeechSynthesis as unknown as SpeechSynthesis);
    expect(navigator.getSelectedVoice()).toEqual(englishVoice);

    navigator.speak('Mulai perjalanan.');
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('shares state across getVoiceNavigator singleton and clears on resetHistory', () => {
    resetSharedVoiceNavigator();
    const mockSpeak = vi.fn();
    const mockCancel = vi.fn();

    const fakeSynth = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: vi.fn().mockReturnValue([{ lang: 'id-ID', name: 'Indonesian', default: true }]),
      onvoiceschanged: null,
      speaking: false,
    };

    const instance1 = getVoiceNavigator(fakeSynth as unknown as SpeechSynthesis);
    instance1.markAsSpoken('leg-1');
    expect(instance1.hasSpoken('leg-1')).toBe(true);

    instance1.resetHistory();
    expect(instance1.hasSpoken('leg-1')).toBe(false);
    expect(mockCancel).toHaveBeenCalled();
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

describe('Navigation State & Infinite Loop Prevention', () => {
  it('deduplicates practically identical coordinates in setUserCoords (< 0.00001 deg threshold)', () => {
    const initialCoords: [number, number] = [-6.2088, 106.8456];
    useTransitStore.getState().setUserCoords(initialCoords);

    const firstState = useTransitStore.getState().userCoords;
    expect(firstState).toEqual(initialCoords);

    // Micro-jitter: +0.000005 deg (~0.5 meters) -> should NOT update reference or re-render
    const jitterCoords: [number, number] = [-6.208805, 106.845604];
    useTransitStore.getState().setUserCoords(jitterCoords);

    const secondState = useTransitStore.getState().userCoords;
    expect(secondState).toBe(firstState); // Reference identity preserved!

    // Significant move: +0.0002 deg (~22 meters) -> SHOULD update state
    const movedCoords: [number, number] = [-6.2091, 106.8459];
    useTransitStore.getState().setUserCoords(movedCoords);

    const thirdState = useTransitStore.getState().userCoords;
    expect(thirdState).toEqual(movedCoords);
    expect(thirdState).not.toBe(firstState);
  });

  it('deduplicates redundant setMapCenter calls with same center and zoom', () => {
    const initialCenter: [number, number] = [-6.2088, 106.8456];
    useTransitStore.getState().setMapCenter(initialCenter, 13);

    const firstCenter = useTransitStore.getState().mapCenter;

    // Negligible difference (< 0.00001 deg) with same zoom
    useTransitStore.getState().setMapCenter([-6.208802, 106.845603], 13);
    const secondCenter = useTransitStore.getState().mapCenter;
    expect(secondCenter).toBe(firstCenter); // Reference identity preserved!
  });
});

describe('BackgroundKeepAliveManager & Lock Screen Keep-Alive', () => {
  it('manages silent audio lifecycle and MediaSession metadata formatting', () => {
    const mockResume = vi.fn();
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const mockDisconnect = vi.fn();
    const mockClose = vi.fn();

    class FakeGain {
      gain = { setValueAtTime: vi.fn() };
      connect = vi.fn();
    }

    class FakeBufferSource {
      buffer: unknown = null;
      loop = false;
      connect = vi.fn();
      start = mockStart;
      stop = mockStop;
      disconnect = mockDisconnect;
    }

    class FakeAudioContext {
      state = 'suspended';
      sampleRate = 44100;
      currentTime = 0;
      destination = {};
      resume = mockResume;
      close = mockClose;
      createBuffer = vi.fn().mockReturnValue({});
      createGain = vi.fn().mockReturnValue(new FakeGain());
      createBufferSource = vi.fn().mockReturnValue(new FakeBufferSource());
    }

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    if (typeof window !== 'undefined') {
      (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
    }

    // Mock navigator.mediaSession
    let mediaMetadataInstance: { title: string; artist: string; album: string } | null = null;
    class FakeMediaMetadata {
      title: string;
      artist: string;
      album: string;
      constructor(data: { title: string; artist: string; album: string }) {
        this.title = data.title;
        this.artist = data.artist;
        this.album = data.album;
        mediaMetadataInstance = this;
      }
    }
    (globalThis as unknown as { MediaMetadata: unknown }).MediaMetadata = FakeMediaMetadata;

    const mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true,
    });

    const fakeMediaSession = {
      playbackState: 'none',
      metadata: null,
    };
    Object.defineProperty(navigator, 'mediaSession', {
      value: fakeMediaSession,
      configurable: true,
      writable: true,
    });

    const bgManager = new BackgroundKeepAliveManager(new FakeAudioContext() as unknown as AudioContext);

    // 1. Start keep-alive
    bgManager.start();
    expect(bgManager.getIsRunning()).toBe(true);
    expect(mockResume).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
    expect(fakeMediaSession.playbackState).toBe('playing');

    // 2. Update lock screen details (< 1000m)
    bgManager.updateLockScreen({
      instruction: 'Jalan kaki menuju Peron 1',
      distanceMeters: 250,
      targetName: 'Stasiun Manggarai',
    });
    expect(mediaMetadataInstance).not.toBeNull();
    expect(mediaMetadataInstance!.title).toBe('Jalan kaki menuju Peron 1');
    expect(mediaMetadataInstance!.artist).toBe('Jakarta Transit Pulse');
    expect(mediaMetadataInstance!.album).toBe('250 m menuju Stasiun Manggarai');

    // 3. Update lock screen details (> 1000m with lineName)
    bgManager.updateLockScreen({
      instruction: 'Naik KRL arah Stasiun Tanah Abang',
      distanceMeters: 3200,
      targetName: 'Stasiun Tanah Abang',
      lineName: 'Lin Cikarang',
    });
    expect(mediaMetadataInstance!.title).toBe('Naik KRL arah Stasiun Tanah Abang');
    expect(mediaMetadataInstance!.album).toBe('3.2 km menuju Stasiun Tanah Abang • Lin Cikarang');

    // 4. Haptic vibration
    bgManager.triggerHaptic([300, 150, 300]);
    expect(mockVibrate).toHaveBeenCalledWith([300, 150, 300]);

    // 5. Stop keep-alive
    bgManager.stop();
    expect(bgManager.getIsRunning()).toBe(false);
    expect(mockStop).toHaveBeenCalled();
    expect(fakeMediaSession.playbackState).toBe('none');
  });

  it('handles environment without AudioContext or MediaSession without throwing', () => {
    const bgManager = new BackgroundKeepAliveManager();
    expect(() => bgManager.start()).not.toThrow();
    expect(() =>
      bgManager.updateLockScreen({
        instruction: 'Test',
        distanceMeters: 100,
        targetName: 'Test Target',
      })
    ).not.toThrow();
    expect(() => bgManager.triggerHaptic()).not.toThrow();
    expect(() => bgManager.sendNotification('Title', 'Body')).not.toThrow();
    expect(() => bgManager.stop()).not.toThrow();
  });
});



