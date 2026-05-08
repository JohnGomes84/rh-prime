/**
 * Geofence helpers — distância haversine + validação contra cerca da empresa
 * (settings: company.geofence_lat / geofence_lng / geofence_radius_m).
 */

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Extrai lat/lng do formato "lat,lng (±Xm)" usado no clockIn.
 */
export function parseLocationString(loc: string | null | undefined): { lat: number; lng: number } | null {
  if (!loc) return null;
  const m = loc.match(/^(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1]!);
  const lng = parseFloat(m[2]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export interface GeofenceConfig {
  lat: number;
  lng: number;
  radiusM: number;
}

export function evaluateGeofence(
  recordLocation: string | null | undefined,
  cfg: GeofenceConfig | null
): "within" | "outside" | "no_geo" {
  if (!cfg) return "no_geo";
  const point = parseLocationString(recordLocation);
  if (!point) return "no_geo";
  const distance = haversineMeters(point.lat, point.lng, cfg.lat, cfg.lng);
  return distance <= cfg.radiusM ? "within" : "outside";
}
