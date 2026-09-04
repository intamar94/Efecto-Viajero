import type { CanonicalTripContext } from "./tripContext";
import type { DestinationCompatibility } from "./compatibility";

export interface TripDay { day: number; date?: string; destination?: string; focus: string[]; notes: string[]; status: "draft" | "needs_data"; }

export function buildTripDraft(context: CanonicalTripContext, ranked: DestinationCompatibility[]): TripDay[] {
  const start = context.dates.start ? new Date(`${context.dates.start}T00:00:00`) : undefined;
  const end = context.dates.end ? new Date(`${context.dates.end}T00:00:00`) : undefined;
  const count = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) : 1;
  const destinations = ranked.map((r) => r.destination);
  return Array.from({ length: count }, (_, i) => {
    const date = start ? new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10) : undefined;
    const destination = destinations.length ? destinations[Math.min(i, destinations.length - 1)] : undefined;
    const focus = context.interests.length ? context.interests.slice(0, 3) : ["Exploración del destino"];
    return {
      day: i + 1, date, destination: destination?.displayName, focus,
      notes: [
        "Borrador generado desde el contexto compartido.",
        "Horarios, reservas, desplazamientos y precios deben validarse con proveedores antes de confirmar.",
      ],
      status: "needs_data",
    };
  });
}
