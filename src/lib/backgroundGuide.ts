import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface BackgroundGuidePoint {
  id: string;
  nombre: string;
  texto: string;
  lat: number;
  lon: number;
}

export interface BackgroundGuideLocation {
  lat: number;
  lon: number;
}

export interface BackgroundGuideStatus {
  active: boolean;
  muted: boolean;
  lat?: number;
  lon?: number;
  narratedIds: string[];
}

interface BackgroundGuidePlugin {
  startGuide(options: { tripId: string; points: BackgroundGuidePoint[]; thresholdMeters: number }): Promise<void>;
  stopGuide(): Promise<void>;
  setMuted(options: { muted: boolean }): Promise<void>;
  getStatus(): Promise<BackgroundGuideStatus>;
  addListener(eventName: "location", listener: (event: BackgroundGuideLocation) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "spoken", listener: (event: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: "error", listener: (event: { message: string }) => void): Promise<PluginListenerHandle>;
}

const NativeBackgroundGuide = registerPlugin<BackgroundGuidePlugin>("BackgroundGuide");

export function supportsBackgroundGuide(): boolean {
  return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("BackgroundGuide");
}

export function startBackgroundGuide(options: {
  tripId: string;
  points: BackgroundGuidePoint[];
  thresholdMeters: number;
}) {
  return NativeBackgroundGuide.startGuide(options);
}

export function stopBackgroundGuide() {
  return NativeBackgroundGuide.stopGuide();
}

export function muteBackgroundGuide(muted: boolean) {
  return NativeBackgroundGuide.setMuted({ muted });
}

export function getBackgroundGuideStatus() {
  return NativeBackgroundGuide.getStatus();
}

export function onBackgroundGuideLocation(listener: (event: BackgroundGuideLocation) => void) {
  return NativeBackgroundGuide.addListener("location", listener);
}

export function onBackgroundGuideSpoken(listener: (event: { id: string }) => void) {
  return NativeBackgroundGuide.addListener("spoken", listener);
}

export function onBackgroundGuideError(listener: (event: { message: string }) => void) {
  return NativeBackgroundGuide.addListener("error", listener);
}
