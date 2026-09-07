# Jakarta Transit Domain Glossary & Architectural Context

This document defines the core domain terminology, mathematical specifications, and architectural concepts governing the **Jakarta Multi-Modal Transit Tracker** (KRL Commuterline & TransJakarta).

---

## 1. Core Domain Concepts

### A. Interchange Nodes
- **Definition**: Transit hubs where passengers can transfer between lines of the same mode (e.g. between KRL Cikarang and KRL Bogor at Stasiun Manggarai) or across distinct transit modes (e.g. KRL Commuterline $\leftrightarrow$ TransJakarta BRT).
- **Physical vs. Cross-Platform Connections**:
  - **Cross-Platform / Platform Junction** (e.g., `Stasiun Manggarai`): Passengers switch platforms inside the fare gates. Transfer penalty is primarily headway wait time.
  - **Physical / Intermodal Skybridge** (e.g., `Stasiun Sudirman` $\leftrightarrow$ `Halte Dukuh Atas`, `Stasiun Cawang` $\leftrightarrow$ `Halte Cikoko`): Passengers tap out/in and walk through dedicated pedestrian skybridges or underground tunnels. Requires walking transfer time (2 to 5 minutes) plus boarding wait time.
- **Interchange Modeling**: Explicitly represented via `INTERCHANGE_CONNECTIONS` with directional links, walking durations, and pedestrian instructions.

### B. Headway
- **Definition**: The scheduled time interval between successive trains or buses operating in the same direction on a specific line.
- **Corridor Specifications**:
  - `krl-cikarang` (KRL Commuter Line Cikarang): **6 minutes** peak headway.
  - `krl-bogor` (KRL Commuter Line Bogor): **5 minutes** peak headway.
  - `tj-corridor-1` (TransJakarta Koridor 1 Blok M - Kota): **4 minutes** peak headway.
- **Routing Impact**: Used to calculate realistic transfer wait buffers ($\approx \text{headway}$ or fixed transfer buffer) added to total journey duration.

### C. Haversine Proximity Threshold
- **Definition**: The spherical distance boundary used by the geo-tracking radar to determine when a passenger is approaching their destination.
- **Mathematical Specification**:
  $$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
  Where:
  - $R = 6,371,000\text{ m}$ (mean radius of Earth).
  - $\phi_1, \phi_2$: Geodetic latitudes in radians.
  - $\Delta \phi = \phi_2 - \phi_1$, $\Delta \lambda = \lambda_2 - \lambda_1$.
- **Perimeter Threshold**: Default is **400 meters** (configurable from 200m to 1200m via UI slider).
- **Sampling Rate**: Monitored continuously via `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`, `maximumAge: 3000ms`, `timeout: 10000ms`.

### D. Polyline Segments
- **Definition**: An ordered series of geodetic coordinates $[lat, lng]$ that outline the exact geographical path traversed by a transit vehicle or planned journey.
- **Structure**:
  - **Base Line Vector**: Pre-seeded coordinates connecting ordered stations for static corridor rendering.
  - **Active Journey Polyline**: Dynamically assembled subset of coordinates tracing:
    $$\text{Origin} \longrightarrow [\text{Intermediate Stops}] \longrightarrow (\text{Interchange Walk}) \longrightarrow [\text{Leg 2 Stops}] \longrightarrow \text{Destination}$$
  - Rendered with high-contrast glowing neon cyan overlay and white dashed inner stroke.

### E. Disembark Triggers (Wake-Up Geo-Alarm)
- **Definition**: The coordinated escalation mechanism executed immediately when $d \le \text{thresholdMeters}$.
- **Multi-Modal Escalation Steps**:
  1. **Web Audio API Procedural Synthesizer**: In-browser dual-tone siren (880 Hz $\leftrightarrow$ 587.33 Hz) and harmonic station chime generated dynamically. Requires zero external audio file downloads.
  2. **Web Notification API**: Dispatches an operating system push notification (`Notification('Waktunya Turun!', ...)`).
  3. **Haptic Feedback**: Fires mobile vibration pattern via `navigator.vibrate([300, 150, 300])`.
  4. **High-Contrast Modal Alert**: Displays a full-screen pulsing warning banner requiring affirmative passenger dismissal.

---

## 2. Fare Computation Rules (Indonesian Rupiah)

### KRL Commuterline Formula
- Base fare: **Rp 3.000** for the first 25 km.
- Incremental tier: **+Rp 1.000** for every additional 10 km (or fraction thereof).
- Formula:
  $$\text{Fare}_{\text{KRL}} = 3000 + \max\left(0, \left\lceil \frac{\text{distanceKm} - 25}{10} \right\rceil \times 1000\right)$$

### TransJakarta BRT Formula
- Flat rate: **Rp 3.500** across all regular trunk corridors regardless of travel distance.

### Multi-Modal Journey Fare
- $\text{Total Fare} = \sum \text{Segment Fares}$.
