# Jason's Driver App

A mobile-first web application for Jason's alcohol delivery drivers. The app is built with React (Vite) and TypeScript-style components, implements a lightweight query client for server state, and mirrors the provided high-fidelity design. Drivers can authenticate, manage orders end-to-end, chat in real time, verify compliance, capture signatures, and stream location updates.

## Features

- **Authentication:** Email/password sign-in with session persistence in `sessionStorage`.
- **Orders workflow:** Pending, Active, and Completed tabs with timers, priority highlighting, and order detail flows (Accept → Start → Arrive → Verify → Complete).
- **Compliance tooling:** Verification checklist, signature capture via `<canvas>`, and completion guardrails.
- **Navigation helpers:** Quick links to Google Maps and Waze from each order.
- **Realtime chat:** WebSocket broadcast for inbound chat messages plus optimistic sends when the driver replies.
- **Location streaming:** Uses the Web Geolocation API with foreground visibility checks and throttled telemetry posts.
- **Mock CMS:** Node HTTP server + manual WebSocket implementation matching the documented REST/WS contracts for local development.
- **PWA scaffold:** Preconfigured manifest + service worker (via `vite-plugin-pwa`) for installability reminders.
- **Unit tests:** `node:test` coverage for timer thresholds and API client auth headers using `esbuild` to compile TypeScript modules.

## Getting Started

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` (optional). Defaults align with the bundled mock services.

```bash
VITE_CMS_BASE_URL=http://localhost:4310
VITE_WS_URL=ws://localhost:4310
```

### Available Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start Vite dev server. |
| `npm run build` | Production build. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Compile test targets with `esbuild` then execute unit tests via `node:test`. |
| `npm run mock` | Launch the mock CMS + WebSocket server (HTTP `:4310`). |

Start both the mock server and the Vite dev server for a complete experience:

```bash
npm run mock
# in another terminal
npm run dev
```

The driver portal is available at <http://localhost:5173>. Login accepts any email plus a password ≥ 6 characters.

## Mock CMS & WebSocket Details

The `mock-cms/server.js` file provides:

- REST endpoints mirroring the specification (auth, driver, orders, telemetry, chat).
- In-memory order and chat datasets seeded with the design's sample orders.
- Minimal WebSocket handshake + framing for realtime order/chat broadcasts.
- Basic telemetry buffering for posted geolocation payloads.

WebSocket events:

- `ORDER_UPDATED` — broadcast when an order transitions state.
- `CHAT_MESSAGE` — broadcast for all chat messages (including driver echoes).
- `DRIVER_BROADCAST` — emitted when the driver changes status.

## Architecture Notes

- **Routing:** React Router with protected routes and an application shell providing header + sticky bottom navigation.
- **State management:** Custom query client (`src/hooks/queryClient.tsx`) models the React Query API (queries, mutations, cache invalidation) without external dependencies.
- **Auth context:** `AuthProvider` stores the driver profile + token, persists to `sessionStorage`, and exposes status updates.
- **Orders domain:** `useOrders*` hooks wrap API access, reuse the query cache, and provide mutations for state transitions.
- **Signature pad:** Canvas-based implementation using pointer events, forwarding imperative `clear` + `toDataURL` APIs to parent components.
- **Location streaming:** `useLocationStreamer` starts `navigator.geolocation.watchPosition` when the driver is ONLINE/ON_DELIVERY and respects the Page Visibility API before posting telemetry.

## PWA & Mobile Guidance

- Manifest + icons live under `public/`. Vite's PWA plugin registers a service worker for precaching.
- Icons are maintained as SVG sources so no binary assets are required in git; adjust the manifest if you regenerate raster variants.
- Drivers are prompted via a “Shift Mode” banner to keep the app in the foreground; document the platform-specific background limits in ops runbooks.
- Encourage installing the PWA (Add to Home Screen) for better persistence.

## Testing

Unit tests use Node's built-in runner and `esbuild` for lightweight TS compilation.

```bash
npm run test
```

## Browser Location Limits

Browsers pause geolocation updates when the tab is backgrounded (especially on iOS). The hook pauses watching when the document is hidden and resumes on visibility. For production, consider native wrappers or background sync strategies to guarantee continuous telemetry.
