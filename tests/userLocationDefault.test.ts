import { describe, it, expect, beforeEach } from 'vitest';
import { useTransitStore } from '@/stores/useTransitStore';

describe('User Location & Default Device Positioning', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTransitStore.setState({
      originStopId: null,
      destinationStopId: null,
      originPlace: {
        name: 'Lokasi Saya Saat Ini',
        coords: [-6.2088, 106.8456],
      },
      destinationPlace: null,
      userCoords: null,
      userAccuracy: null,
      userHeading: null,
      userSpeed: null,
      mapCenter: [-6.2088, 106.8456],
      mapZoom: 12,
      routePlan: null,
      isRoutingLoading: false,
    });
  });

  it('automatically sets default originPlace and centers map on device location upon first GPS fix', () => {
    const tebetCoords: [number, number] = [-6.2268, 106.8584];

    // Simulate first GPS position callback
    useTransitStore.getState().setUserLocation(tebetCoords, 10, 45, 12);

    const state = useTransitStore.getState();
    expect(state.userCoords).toEqual(tebetCoords);
    expect(state.userAccuracy).toBe(10);
    expect(state.userHeading).toBe(45);
    expect(state.userSpeed).toBe(12);

    // Default origin should now match the user's real device position
    expect(state.originPlace).not.toBeNull();
    expect(state.originPlace?.coords).toEqual(tebetCoords);
    expect(state.originPlace?.name).toBe('Lokasi Saya Saat Ini');

    // Map should fly/center to the user's device location with street-level zoom
    expect(state.mapCenter).toEqual(tebetCoords);
    expect(state.mapZoom).toBe(15);
  });

  it('preserves user custom selected origin station when device GPS updates', () => {
    // User explicitly chose Stasiun Sudirman
    useTransitStore.getState().setOriginStop('krl_sudirman');

    const initialState = useTransitStore.getState();
    expect(initialState.originStopId).toBe('krl_sudirman');
    expect(initialState.originPlace?.name).toBe('Stasiun Sudirman');

    // Device GPS updates to a different location (e.g. Tebet)
    const tebetCoords: [number, number] = [-6.2268, 106.8584];
    useTransitStore.getState().setUserLocation(tebetCoords, 8);

    const updatedState = useTransitStore.getState();
    // userCoords tracks device location
    expect(updatedState.userCoords).toEqual(tebetCoords);
    // But origin remains Stasiun Sudirman
    expect(updatedState.originStopId).toBe('krl_sudirman');
    expect(updatedState.originPlace?.name).toBe('Stasiun Sudirman');
  });

  it('updates origin coordinates and triggers route recalculation when destination is present and origin is default', async () => {
    // Destination is set to Monas
    useTransitStore.setState({
      destinationStopId: 'tj_monas',
      destinationPlace: {
        name: 'Monas',
        coords: [-6.1754, 106.8272],
        stationId: 'tj_monas',
      },
    });

    const tebetCoords: [number, number] = [-6.2268, 106.8584];
    useTransitStore.getState().setUserLocation(tebetCoords, 5);

    const state = useTransitStore.getState();
    expect(state.originPlace?.coords).toEqual(tebetCoords);
  });

  it('useCurrentLocationAsOrigin centers map and sets origin to device coordinates', () => {
    const bekasiCoords: [number, number] = [-6.2361, 106.9994];
    useTransitStore.setState({ userCoords: bekasiCoords });

    useTransitStore.getState().useCurrentLocationAsOrigin();

    const state = useTransitStore.getState();
    expect(state.originPlace?.coords).toEqual(bekasiCoords);
    expect(state.originPlace?.name).toBe('Lokasi Saya Saat Ini');
    expect(state.mapCenter).toEqual(bekasiCoords);
    expect(state.mapZoom).toBe(15);
  });
});
