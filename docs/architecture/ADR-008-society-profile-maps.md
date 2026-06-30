# ADR-008: Society profile maps (OpenStreetMap)

**Status:** Accepted  
**Date:** 2026-07-01

## Context

Society profile pages need an interactive map (location pin, optional boundary
overlay, distance from user) without paid map API keys.

## Decision

Use **Leaflet + OpenStreetMap** street tiles with an optional **Esri World
Imagery** satellite toggle. Directions open via an external **Google Maps**
deep link (no embedded Google Maps API).

Geolocation is enabled via `Permissions-Policy: geolocation=(self)` and only
after explicit user action.

Land area uses admin-entered kanal figures plus optional GeoJSON boundary
area computed with `@turf/area`.

## Consequences

- No recurring map API billing for tile loads at current scale.
- CSP `connect-src` and `img-src` allow HTTPS tile endpoints.
- Map is a client-only dynamic import to preserve ISR/SEO on the server page.
