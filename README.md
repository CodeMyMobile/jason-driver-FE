# Jason's Driver App

Mobile-first driver operations portal built with React + Vite. Drivers authenticate, manage deliveries, capture compliance checkpoints, chat with staff/customers, and stream live location updates to Jason's CMS.

## Tech Stack

- React 18 (functional components + hooks)
- Vite build tooling
- React Router v6 for routing
- Custom data hooks with polling + WebSocket bridge for realtime updates
- Canvas-based signature capture with base64 payloads
- Vanilla CSS (Tailwind-like utility styling) with responsive layout targeting 430px breakpoints
- Optional PWA manifest for installability
- Geolocation streaming with browser visibility controls

## Getting Started

```bash
npm install
npm run dev
```

Environment variables are defined in `.env.example`:

- `VITE_CMS_BASE_URL` – REST API root for the CMS (defaults to `http://localhost:4000` when omitted).
- `VITE_WS_URL` – optional WebSocket endpoint for realtime events.

> The UI gracefully falls back to local mock data when API endpoints are unreachable so the experience works out-of-the-box without a backend.

### Mock data & realtime simulation

When `VITE_CMS_BASE_URL` or `VITE_WS_URL` are not supplied, the app automatically switches to in-browser mock data and a timer-driven mock socket that replays ORDER and CHAT updates every 15 seconds. This keeps flows testable without external services.

### Geolocation permissions

The browser will request location permission once the driver status is set to **Online** or **On Delivery**. Tracking pauses automatically when the tab is hidden to respect background restrictions.

### Progressive Web App

A lightweight `manifest.webmanifest` is provided so you can install the driver portal on mobile devices. Add a service worker if you need offline caching.

## Testing the core flows

1. Sign in from `/login` using any email and password ≥ 6 characters (or click **Use Demo Credentials**).
2. Accept an order from the **Pending** tab, work through arrival + verification steps, capture a signature, and mark it complete.
3. Send chat messages from the **Chat** tab – outbound messages send optimistically and are echoed back via the socket bridge.
4. Toggle driver status from the **Profile** tab and watch the real-time tracking indicator update.

## Accessibility & No-Binary Policy

All assets in this repository are text-based. Icons are rendered with emoji/SVG, fonts rely on system defaults, and signature data is stored as base64 strings. No binary dependencies or compiled artifacts are committed, ensuring the codebase remains fully auditable.
