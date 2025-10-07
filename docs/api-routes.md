# API Routes Used by Jason Driver Frontend

This frontend integrates exclusively with the production Jason's Liquor CMS service. All requests are issued through the shared Axios client in [`src/api/client.ts`](../src/api/client.ts), which defaults to the live host `https://api.jasonsliquor.com` unless overridden by `VITE_CMS_BASE_URL` or `VITE_API_BASE_URL`.

## Authentication
- `POST /auth/login` – Authenticate the driver and receive the session token.
- `GET /driver/me` – Fetch the currently authenticated driver profile.
- `PATCH /driver/status` – Update the driver's availability (`ONLINE`, `OFFLINE`, or `ON_DELIVERY`).

## Orders
- `GET /orders` – Retrieve all orders relevant to the logged-in driver.
- `POST /orders/:id/accept` – Accept an assigned order.
- `POST /orders/:id/start` – Mark an accepted order as started and begin delivery.
- `POST /orders/:id/arrive` – Mark an order as arrived at the destination.
- `POST /orders/:id/complete` – Submit proof of delivery (including the captured signature) and complete the order.

## Chat
- `GET /chat/threads/current` – Load the current support chat thread for the driver.
- `POST /chat/threads/current` – Send a message in the active support chat thread.

## Telemetry
- `POST /telemetry/locations` – Send periodic GPS telemetry updates while the driver is online or on a delivery.

## WebSocket Events
Real-time order updates are consumed through the Jason's Liquor WebSocket service configured via `VITE_WS_URL`. The client subscribes to:
- `ORDER_CREATED`
- `ORDER_UPDATED`

No mock APIs or sockets are used; unsuccessful connections are logged without falling back to local or dummy data.

## Troubleshooting: 404 on `/auth/login`

Seeing `https://staging-api.jasonsliquor.com/auth/login` return `404 Not Found` means the frontend reached the staging host but that server has no handler registered for `/auth/login`. Common causes are:

1. The staging base URL requires an extra prefix (for example, `https://staging-api.jasonsliquor.com/api`), so the login request should target `.../api/auth/login` instead of `.../auth/login`.
2. The staging deployment is missing or misconfigured for authentication, so the route truly does not exist until the backend is updated.

Because the Axios client in [`src/api/client.ts`](../src/api/client.ts) simply appends `/auth/login` to whichever origin you provide in `VITE_CMS_BASE_URL`, correcting that environment variable fixes the 404 without further frontend changes.
