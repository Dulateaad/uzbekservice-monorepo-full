# PeopleHub — No Paid APIs

This document certifies that PeopleHub uses **zero paid third-party APIs** for its core functionality.

## Self-Hosted Map Stack

All map services run locally via `docker-compose` and use open-source software with free OSM data.

### 1. Map Tiles — tileserver-gl

| Property | Value |
|---|---|
| **Service** | [tileserver-gl](https://github.com/maptiler/tileserver-gl) |
| **Docker image** | `maptiler/tileserver-gl:v4.6.6` |
| **Port** | 8080 |
| **Data** | OpenMapTiles MBTiles (Kazakhstan extract) |
| **License** | BSD-2-Clause |

Serves vector map tiles to the browser. The client uses **MapLibre GL JS** (open-source fork of Mapbox GL JS) to render the map.

### 2. Geocoding — Nominatim

| Property | Value |
|---|---|
| **Service** | [Nominatim](https://nominatim.org/) |
| **Docker image** | `mediagis/nominatim:4.4` |
| **Port** | 8088 |
| **Data** | Kazakhstan PBF from Geofabrik (~200MB) |
| **License** | GPLv2 |

Provides:
- **Forward geocoding**: text address -> coordinates (`/search`)
- **Reverse geocoding**: coordinates -> text address (`/reverse`)

### 3. Routing — OSRM

| Property | Value |
|---|---|
| **Service** | [OSRM](http://project-osrm.org/) |
| **Docker image** | `osrm/osrm-backend:v5.27.1` |
| **Port** | 5000 |
| **Data** | Kazakhstan PBF from Geofabrik, pre-processed with MLD algorithm |
| **License** | BSD-2-Clause |

Provides:
- **Route calculation**: distance, duration, turn-by-turn geometry (`/route/v1/driving/`)
- **Nearest road snapping** (`/nearest/v1/driving/`)

### 4. Map Rendering — MapLibre GL JS

| Property | Value |
|---|---|
| **Library** | [maplibre-gl-js](https://maplibre.org/) |
| **npm package** | `maplibre-gl` |
| **License** | BSD-3-Clause |

Open-source fork of Mapbox GL JS. No token or API key required. Renders vector tiles in the browser using WebGL.

## Data Sources

All map data comes from **OpenStreetMap** (ODbL license):
- PBF extract: `https://download.geofabrik.de/asia/kazakhstan-latest.osm.pbf`
- Updated regularly by the OSM community

## Quick Start

```bash
# 1. Download and prepare OSM data
./scripts/download-osm-data.sh

# 2. Start all services
docker-compose up -d

# 3. Wait for Nominatim import (~15-30 minutes for Kazakhstan)
# Check status: http://localhost:8088/status

# 4. Verify services
curl http://localhost:8080/health                    # Tile server
curl http://localhost:5000/nearest/v1/driving/76.9,43.2  # OSRM
curl "http://localhost:8088/search?q=Almaty&format=json"  # Nominatim
```

## Environment Variables

### Client (Vite)
```
VITE_TILE_SERVER_URL=http://localhost:8080
VITE_NOMINATIM_URL=http://localhost:8088
VITE_OSRM_URL=http://localhost:5000
```

### Server
```
OSRM_URL=http://localhost:5000
NOMINATIM_URL=http://localhost:8088
```

## Replaced Paid Services

| Was (Paid) | Now (Free, Self-Hosted) |
|---|---|
| Mapbox GL JS | MapLibre GL JS |
| Mapbox Tiles API | tileserver-gl + OpenMapTiles |
| Mapbox Geocoding API | Nominatim |
| Mapbox Directions API | OSRM |
| Mapbox access token | Not needed |

## Resource Requirements (Kazakhstan data)

| Service | RAM | Disk | CPU |
|---|---|---|---|
| tileserver-gl | ~200MB | ~500MB (MBTiles) | Low |
| OSRM | ~500MB | ~1GB (processed) | Low |
| Nominatim | ~2GB (import), ~1GB (running) | ~5GB | Medium (during import) |

Total: ~2GB RAM, ~7GB disk for Kazakhstan region.
