import type { EstadoRequisito } from "@/lib/types";
import { TravelStatus } from "./TravelStatus";

const STATUS: Record<EstadoRequisito, "available" | "pending" | "incompatible"> = {
  verde: "available",
  amarillo: "pending",
  rojo: "incompatible",
};

export function EstadoBadge({ estado }: { estado: EstadoRequisito }) {
  return <TravelStatus status={STATUS[estado]} />;
}
