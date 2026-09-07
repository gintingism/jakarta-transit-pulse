# Engineering Guardrails & Rules for AI Agents

All autonomous agents and software engineers contributing to this codebase must adhere strictly to these principles. Zero exceptions.

---

## 1. Zero `any` Types in TypeScript
- **Rule**: Never use `any`, `as any`, or implicit `any`.
- **Typing Standard**:
  - Always write explicit interfaces or type aliases for all domain objects, function arguments, and return values.
  - Utilize discriminated unions (e.g. `TransitType = 'krl' | 'tj'`, `LineIdentifier = 'krl-cikarang' | 'krl-bogor' | 'tj-corridor-1'`).
  - Use `unknown` with type narrowing guards instead of `any` when handling indeterminate data.
- **Verification**: Running `npm run type-check` (`tsc --noEmit`) must exit with code 0.

---

## 2. Pure Functions Isolated from React & Leaflet DOM
- **Rule**: Mathematical, algorithmic, and domain calculations must live in pure, stateless functions completely decoupled from React hooks, components, or Leaflet DOM APIs.
- **Domain Seams**:
  - Distance calculations (Haversine formula), formatting, transit fare schedules, travel time estimates, and graph traversal must reside exclusively in `src/lib/transitEngine.ts`.
  - Zero imports of `react`, `react-dom`, `leaflet`, or `react-leaflet` inside `src/lib/` or `src/data/`.
- **Testability**: Every pure function must be directly unit-testable without mounting components or mocking browser DOMs.

---

## 3. Modular Architecture (Deep Modules, Narrow Interfaces)
- **Rule**: Design deep modules with rich internal capabilities behind minimal, simple interfaces.
  - Avoid shallow helper layers and leaky abstractions.
  - State management and browser API lifecycles belong in dedicated custom hooks (`useTransitRoute`, `useGeoAlarm`).
  - Map components that rely on Leaflet browser globals must be dynamically loaded with `ssr: false`.
- **Styling Standards**:
  - Use Tailwind CSS with dark palette (`zinc-900`, `zinc-950`, `border-zinc-800`).
  - No cluttered inline styles; use clean Tailwind utility classes.

---

## 4. Test-Driven Verification Before Declaring Done
- **Rule**: No feature, refactor, or bug fix is considered complete until validated by automated test suites.
- **Mandatory Verification Gate**:
  1. `npm run test`: Vitest test suite must pass with 100% green tests.
  2. `npm run type-check`: Strict TypeScript typecheck must pass with 0 errors.
  3. `npm run build`: Next.js production build must compile successfully.
- If any test or typecheck fails, fix the underlying defect immediately before reporting back to the user.
