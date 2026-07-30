"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

function divIcon(color: string, label: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:16px;height:16px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)" title="${label}"></div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function carDivIcon() {
  return L.divIcon({
    html: `<div style="background:#0f172a;color:white;width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">🚗</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const pickupIcon = divIcon("#0f766e", "Pickup");
const dropoffIcon = divIcon("#f59e0b", "Drop-off");

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function AutoFit({ points, fitKey }: { points: [number, number][]; fitKey?: string | number }) {
  const map = useMap();
  // Live tracking refetches the route every few seconds, which would refit
  // (and visibly jerk/rezoom) the map on every update if we fit on every
  // points change. Only refit once per fitKey — callers pass a value that
  // changes on a meaningful phase change (e.g. heading to pickup -> en
  // route to drop-off), not on every position tick.
  const lastFitKey = useRef<string | number | undefined>(undefined);
  useEffect(() => {
    if (points.length === 0) return;
    if (fitKey !== undefined && lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
  }, [map, points, fitKey]);
  return null;
}

export type LatLng = { lat: number; lng: number };

export function LocationMap({
  pickup,
  dropoff,
  driver,
  nearbyDrivers,
  onMapClick,
  className,
  routeGeometry,
  fitKey,
}: {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  /** A single assigned driver — this trip's driver, or the signed-in driver's own live position. */
  driver?: LatLng | null;
  /** Other online drivers nearby, shown before a trip is assigned (the customer booking map). */
  nearbyDrivers?: LatLng[] | null;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  /** [lat, lng] path tracing the real road route, from /api/route. Falls back to a straight line when omitted. */
  routeGeometry?: [number, number][] | null;
  /** Changes only on a meaningful phase change; re-fits the view once per value instead of on every live update. */
  fitKey?: string | number;
}) {
  const routePath = routeGeometry?.length
    ? routeGeometry
    : pickup && dropoff
      ? ([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ] as [number, number][])
      : null;

  const points: [number, number][] =
    routeGeometry && routeGeometry.length > 0
      ? routeGeometry
      : pickup || dropoff
        ? [
            ...(pickup ? [[pickup.lat, pickup.lng] as [number, number]] : []),
            ...(dropoff ? [[dropoff.lat, dropoff.lng] as [number, number]] : []),
          ]
        : driver
          ? [[driver.lat, driver.lng]]
          : (nearbyDrivers ?? []).map((d) => [d.lat, d.lng] as [number, number]);

  const fallbackCenter: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : driver
      ? [driver.lat, driver.lng]
      : SRI_LANKA_CENTER;

  return (
    <div className={className}>
      <MapContainer
        center={fallbackCenter}
        zoom={pickup || driver ? 14 : 8}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        <AutoFit points={points} fitKey={fitKey} />
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />}
        {driver && <Marker position={[driver.lat, driver.lng]} icon={carDivIcon()} />}
        {nearbyDrivers?.map((d, i) => (
          <Marker key={`${d.lat}-${d.lng}-${i}`} position={[d.lat, d.lng]} icon={carDivIcon()} />
        ))}
        {routePath && (
          <Polyline
            positions={routePath}
            pathOptions={
              routeGeometry?.length
                ? { color: "#0f766e", weight: 4 }
                : { color: "#0f766e", weight: 3, dashArray: "6 8" }
            }
          />
        )}
      </MapContainer>
    </div>
  );
}
