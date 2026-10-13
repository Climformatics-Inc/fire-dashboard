import { useEffect, useRef, useState } from "react";
import { GeoJSON as GeoJSONLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const TILE_SIZE = 256;
const FALLBACK = "#6B7280";
const MAX_SEGMENTS = 8000;
const CHUNK = 400;

type Props = {
  data: GeoJSON.GeoJsonObject;
  tileUrl: string;
  weight?: number;
};

function lngLatToWorld(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n;
  return { x, y };
}

function collectRings(geom: GeoJSON.Geometry | null | undefined): [number, number][][] {
  if (!geom) return [];
  if (geom.type === "LineString") return [geom.coordinates as [number, number][]];
  if (geom.type === "MultiLineString")
    return geom.coordinates as [number, number][][];
  if (geom.type === "GeometryCollection") {
    return geom.geometries.flatMap((g) => collectRings(g));
  }
  return [];
}

function ringBounds(ring: [number, number][]) {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const [lng, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
}

function densify(ring: [number, number][], stepDeg: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const dist = Math.hypot(lng2 - lng1, lat2 - lat1);
    const n = Math.max(1, Math.ceil(dist / stepDeg));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t]);
    }
  }
  if (ring.length) out.push(ring[ring.length - 1]);
  return out;
}

function rgbAt(img: ImageData, px: number, py: number): string | null {
  if (px < 0 || py < 0 || px >= img.width || py >= img.height) return null;
  const i = (py * img.width + px) * 4;
  if (img.data[i + 3] < 16) return null;
  return `rgb(${img.data[i]},${img.data[i + 1]},${img.data[i + 2]})`;
}

function loadTile(
  url: string,
  cache: Map<string, Promise<ImageData | null>>
): Promise<ImageData | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  const pending = new Promise<ImageData | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || TILE_SIZE;
        canvas.height = img.naturalHeight || TILE_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  cache.set(url, pending);
  return pending;
}

function tileUrlAt(template: string, z: number, x: number, y: number) {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

function featureList(data: GeoJSON.GeoJsonObject): GeoJSON.Feature[] {
  if (data.type === "FeatureCollection") {
    return (data as GeoJSON.FeatureCollection).features;
  }
  if (data.type === "Feature") {
    return [data as GeoJSON.Feature];
  }
  return [];
}

export default function ColorizedTransmissionLines({
  data,
  tileUrl,
  weight = 2.5,
}: Props) {
  const map = useMap();
  const [colored, setColored] = useState<GeoJSON.FeatureCollection | null>(null);
  const cacheRef = useRef(new Map<string, Promise<ImageData | null>>());
  const genRef = useRef(0);
  const timerRef = useRef<number>();

  const paint = (samples: {
    a: [number, number];
    b: [number, number];
    key: string;
    px: number;
    py: number;
  }[]) => {
    const gen = genRef.current;
    const needed = [...new Set(samples.map((s) => s.key))];
    Promise.all(
      needed.map((key) => {
        const [tz, tx, ty] = key.split("/").map(Number);
        return loadTile(tileUrlAt(tileUrl, tz, tx, ty), cacheRef.current).then(
          (img) => [key, img] as const
        );
      })
    ).then((entries) => {
      if (gen !== genRef.current) return;
      const tiles = new Map(entries);
      setColored({
        type: "FeatureCollection",
        features: samples.map((s) => ({
          type: "Feature",
          properties: {
            color: (tiles.get(s.key) && rgbAt(tiles.get(s.key)!, s.px, s.py)) || FALLBACK,
          },
          geometry: { type: "LineString", coordinates: [s.a, s.b] },
        })),
      });
    });
  };

  const rebuild = () => {
    const gen = ++genRef.current;
    const bounds = map.getBounds().pad(0.12);
    const center = bounds.getCenter();
    const z = Math.min(7, Math.max(5, map.getZoom()));
    const stepDeg = z >= 7 ? 0.025 : 0.04;
    const features = featureList(data);
    const samples: {
      a: [number, number];
      b: [number, number];
      key: string;
      px: number;
      py: number;
    }[] = [];

    let i = 0;
    const step = () => {
      if (gen !== genRef.current) return;
      const end = Math.min(i + CHUNK, features.length);
      for (; i < end && samples.length < MAX_SEGMENTS; i++) {
        const rings = collectRings(features[i].geometry);
        for (const ring of rings) {
          if (!ring.length) continue;
          const [lng0, lat0] = ring[0];
          if (
            Math.abs(lat0 - center.lat) > 12 &&
            Math.abs(lng0 - center.lng) > 12
          ) {
            continue;
          }
          if (!bounds.intersects(ringBounds(ring))) continue;
          const pts = densify(ring, stepDeg);
          for (let p = 0; p < pts.length - 1; p++) {
            const [lng, lat] = pts[p];
            if (!bounds.contains([lat, lng])) continue;
            const world = lngLatToWorld(lat, lng, z);
            const tx = Math.floor(world.x);
            const ty = Math.floor(world.y);
            samples.push({
              a: pts[p],
              b: pts[p + 1],
              key: `${z}/${tx}/${ty}`,
              px: Math.min(
                TILE_SIZE - 1,
                Math.max(0, Math.floor((world.x - tx) * TILE_SIZE))
              ),
              py: Math.min(
                TILE_SIZE - 1,
                Math.max(0, Math.floor((world.y - ty) * TILE_SIZE))
              ),
            });
            if (samples.length >= MAX_SEGMENTS) break;
          }
        }
      }
      if (i < features.length && samples.length < MAX_SEGMENTS) {
        window.setTimeout(step, 0);
        return;
      }
      paint(samples);
    };
    step();
  };

  const schedule = () => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(rebuild, 200);
  };

  useMapEvents({
    moveend: schedule,
    zoomend: schedule,
  });

  useEffect(() => {
    cacheRef.current = new Map();
    setColored(null);
    schedule();
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileUrl, data]);

  return (
    <>
      <GeoJSONLayer
        data={data}
        pathOptions={{
          renderer: L.canvas({ padding: 0.5 }),
          interactive: false,
          color: FALLBACK,
          weight: 1.2,
          opacity: colored ? 0 : 0.85,
        }}
      />
      {colored && (
        <GeoJSONLayer
          key={`${tileUrl}-${colored.features.length}`}
          data={colored}
          style={(feature) => ({
            color: feature?.properties?.color ?? FALLBACK,
            weight,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          })}
          pathOptions={{ renderer: L.canvas({ padding: 0.5 }), interactive: false }}
        />
      )}
    </>
  );
}
