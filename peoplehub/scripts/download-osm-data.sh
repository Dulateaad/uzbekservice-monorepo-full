#!/usr/bin/env bash
#
# download-osm-data.sh — Downloads and prepares all OSM data
# for self-hosted map services (tileserver-gl, OSRM, Nominatim).
#
# Usage:  ./scripts/download-osm-data.sh
# Requires: wget, docker (for OSRM pre-processing)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"

TILES_DIR="$DATA_DIR/tiles"
OSRM_DIR="$DATA_DIR/osrm"

# Geofabrik Kazakhstan extract
PBF_URL="https://download.geofabrik.de/asia/kazakhstan-latest.osm.pbf"
PBF_FILE="$OSRM_DIR/kazakhstan-latest.osm.pbf"

# OpenMapTiles — pre-built MBTiles for Kazakhstan
# Using OpenFreeMap/Protomaps as a source for tiles
MBTILES_URL="https://build.protomaps.com/20240101.pmtiles"

echo "============================================="
echo "  PeopleHub — OSM Data Preparation"
echo "============================================="
echo ""

mkdir -p "$TILES_DIR/styles" "$TILES_DIR/fonts" "$OSRM_DIR"

# ==================== 1. Download Kazakhstan PBF ====================
echo "[1/4] Downloading Kazakhstan PBF from Geofabrik..."
if [ -f "$PBF_FILE" ]; then
  echo "  -> Already exists, skipping. Delete to re-download."
else
  wget -q --show-progress -O "$PBF_FILE" "$PBF_URL"
  echo "  -> Done: $(du -h "$PBF_FILE" | cut -f1)"
fi

# ==================== 2. OSRM Pre-processing ====================
echo ""
echo "[2/4] Pre-processing OSRM routing data..."
OSRM_FILE="$OSRM_DIR/kazakhstan-latest.osrm"

if [ -f "${OSRM_FILE}.datasource_names" ]; then
  echo "  -> OSRM data already processed, skipping."
else
  echo "  -> Step 1/3: osrm-extract..."
  docker run --rm -t \
    -v "$OSRM_DIR:/data" \
    osrm/osrm-backend:v5.27.1 \
    osrm-extract -p /opt/car.lua /data/kazakhstan-latest.osm.pbf

  echo "  -> Step 2/3: osrm-partition..."
  docker run --rm -t \
    -v "$OSRM_DIR:/data" \
    osrm/osrm-backend:v5.27.1 \
    osrm-partition /data/kazakhstan-latest.osrm

  echo "  -> Step 3/3: osrm-customize..."
  docker run --rm -t \
    -v "$OSRM_DIR:/data" \
    osrm/osrm-backend:v5.27.1 \
    osrm-customize /data/kazakhstan-latest.osrm

  echo "  -> OSRM processing complete."
fi

# ==================== 3. Map Tiles ====================
echo ""
echo "[3/4] Preparing map tiles..."
MBTILES_FILE="$TILES_DIR/kazakhstan.mbtiles"

if [ -f "$MBTILES_FILE" ]; then
  echo "  -> MBTiles already exists, skipping."
else
  echo "  -> For production, download OpenMapTiles MBTiles for Kazakhstan."
  echo "  -> Option A: Use tilemaker to generate from PBF (automated):"
  echo "     docker run --rm -v $OSRM_DIR:/input -v $TILES_DIR:/output"
  echo "       ghcr.io/systemed/tilemaker:master"
  echo "       --input /input/kazakhstan-latest.osm.pbf"
  echo "       --output /output/kazakhstan.mbtiles"
  echo ""
  echo "  -> Option B: Download pre-built from OpenMapTiles (requires license for commercial use)."
  echo ""
  echo "  -> Generating with tilemaker now..."

  docker run --rm \
    -v "$OSRM_DIR:/input" \
    -v "$TILES_DIR:/output" \
    ghcr.io/systemed/tilemaker:master \
    --input /input/kazakhstan-latest.osm.pbf \
    --output /output/kazakhstan.mbtiles \
    2>&1 || {
      echo "  !! tilemaker failed. You can manually place an MBTiles file at:"
      echo "     $MBTILES_FILE"
      echo "  -> Continuing..."
    }
fi

# ==================== 4. Fonts for tile labels ====================
echo ""
echo "[4/4] Downloading map fonts (Noto Sans for Russian labels)..."
FONTS_DIR="$TILES_DIR/fonts"

if [ -d "$FONTS_DIR/Noto Sans Regular" ]; then
  echo "  -> Fonts already exist, skipping."
else
  echo "  -> Downloading from openmaptiles/fonts..."
  FONTS_TMP=$(mktemp -d)
  wget -q --show-progress -O "$FONTS_TMP/fonts.tar.gz" \
    "https://github.com/openmaptiles/fonts/releases/download/v3.0/v3.0.tar.gz" || {
      echo "  !! Font download failed. Map labels may not render."
      echo "  -> Continuing..."
    }
  if [ -f "$FONTS_TMP/fonts.tar.gz" ]; then
    tar -xzf "$FONTS_TMP/fonts.tar.gz" -C "$FONTS_DIR" 2>/dev/null || true
    rm -rf "$FONTS_TMP"
    echo "  -> Fonts installed."
  fi
fi

echo ""
echo "============================================="
echo "  Data preparation complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Copy style.json to $TILES_DIR/styles/style.json"
echo "  2. Run: docker-compose up -d"
echo "  3. Wait for Nominatim import (~15-30 min for Kazakhstan)"
echo "  4. Access:"
echo "     - Tiles:     http://localhost:8080"
echo "     - OSRM:      http://localhost:5000"
echo "     - Nominatim: http://localhost:8088"
echo ""
