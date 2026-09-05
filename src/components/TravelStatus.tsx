import type { PresentationStatus } from "@/lib/travelBrain/presentation";
import { presentationStatus } from "@/lib/travelBrain/presentation";

export function TravelStatus({ status, className = "" }: { status: PresentationStatus; className?: string }) {
  const item = presentationStatus(status);
  return <span className={`travel-status ${item.className} inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${className}`} role="status" aria-label={item.label}><span aria-hidden="true">{item.icon}</span>{item.label}</span>;
}

export function DecisionStatus({ status, className = "" }: { status: PresentationStatus; className?: string }) {
  return <TravelStatus status={status} className={className} />;
}
