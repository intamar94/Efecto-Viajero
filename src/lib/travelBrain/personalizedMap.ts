import type { TripItem, TripState } from "./types";

export interface MapCandidate extends TripItem {
  distanceMeters?: number;
  openNow?: boolean;
}

export interface MapContext {
  latitude: number;
  longitude: number;
  day?: number;
  hour?: number;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const earth = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(x));
}

function score(item: MapCandidate, trip: TripState): number {
  let value = 0;
  if (item.status === "done" || item.status === "discarded" || item.status === "unavailable") value -= 100;
  if (item.day === trip.activeDay) value += 30;
  if (item.category === "activity" || item.category === "restaurant" || item.category === "place") value += 10;
  if (item.evidence?.confidence === "high") value += 8;
  if (item.distanceMeters !== undefined) value += Math.max(0, 25 - item.distanceMeters / 250);
  return value;
}

export function rankNearbyForTrip(trip: TripState, context: MapContext, candidates: MapCandidate[]): MapCandidate[] {
  return candidates
    .map((item) => ({
      ...item,
      distanceMeters:
        item.latitude !== undefined && item.longitude !== undefined
          ? distanceMeters(context.latitude, context.longitude, item.latitude, item.longitude)
          : undefined,
    }))
    .sort((a, b) => score(b, trip) - score(a, trip))
    .slice(0, 12);
}
