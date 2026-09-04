import type { DocumentoViaje, Viaje } from "./types";

type DocumentoConImporte = DocumentoViaje & { importe?: number; moneda?: string };

export function calcularPresupuesto(viaje: Viaje): number {
  const base = viaje.contexto.presupuesto?.importe ?? viaje.contexto.presupuestoTotal ?? 0;
  const documentos = (viaje.documentos ?? []) as DocumentoConImporte[];
  const importesVault = documentos.reduce((total, documento) => total + (Number(documento.importe) || 0), 0);
  return base + importesVault;
}

export function calcularImporteVault(viaje: Viaje): number {
  return ((viaje.documentos ?? []) as DocumentoConImporte[]).reduce((total, documento) => total + (Number(documento.importe) || 0), 0);
}
