# Media & Memory Architecture

## Principle
Efecto Viajero does not need to become a second photo library. Original photos and videos should remain in the user's device or connected cloud whenever the provider permits it.

The application stores structured references and trip intelligence: provider, asset id, date, location, categories, trip/day association, selection state and evidence. Temporary media used to render a requested result should have a defined lifecycle and be removed when no longer required.

## Internal standard
All providers are normalized into `EVMediaAsset`. Memory Agent, map, itinerary and recap features never depend directly on Google Photos, iCloud, OneDrive or Dropbox APIs.

```text
User media
  -> provider connector
  -> EV Media Standard
  -> Media Intelligence
  -> Memory Agent
  -> Travel Brain
```

## User control
- Never turn the entire library into memories without consent.
- A newly detected candidate can be presented as: "Parece ... ¿Quieres guardarlo como recuerdo?"
- Manual selection always remains available.
- Cloud connections require explicit permissions.
- The app should communicate when a feature needs a local copy or temporary processing.

## Video
The first implementation creates a basic storyboard and can render a short WebM locally from available thumbnails. A future server/media provider can produce richer output without changing the `MemoryVideoRequest` contract.

## Providers
Provider adapters expose capabilities. A provider that cannot perform an operation must report that capability instead of being treated as if it could. This prevents false promises in the UI and allows connectors to be added progressively.
