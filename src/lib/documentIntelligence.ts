import type { CategoriaDocumento, DocumentoViaje } from "./types";

export interface ImpactoDocumento {
  titulo: string;
  estado: "informativo" | "requiere-comprobacion" | "accion";
  detalle: string;
}

const NOMBRES: Record<CategoriaDocumento, string> = {
  vuelo: "vuelo",
  tren_bus: "tren o autobús",
  alojamiento: "alojamiento",
  transporte_local: "transporte local",
  entrada: "entrada",
  seguro: "seguro",
  documento_personal: "documentación personal",
  otro: "documento",
};

export function impactosDelDocumento(documento: DocumentoViaje): ImpactoDocumento[] {
  const nombre = NOMBRES[documento.tipo];
  const impactos: ImpactoDocumento[] = [];

  if (documento.tipo === "vuelo" || documento.tipo === "tren_bus") {
    impactos.push({ titulo: "Añadir al movimiento del viaje", estado: "accion", detalle: `Este ${nombre} contiene información que puede completar los tramos del itinerario.` });
    impactos.push({ titulo: "Comprobar fechas y horarios", estado: "requiere-comprobacion", detalle: "El documento aporta una referencia, pero la aplicación no debe tratarla como una reserva verificada hasta contrastar los datos." });
  } else if (documento.tipo === "alojamiento") {
    impactos.push({ titulo: "Relacionar con una etapa", estado: "accion", detalle: "La reserva puede vincularse a la ciudad correspondiente y afectar al presupuesto y al itinerario." });
    impactos.push({ titulo: "Comprobar dirección", estado: "requiere-comprobacion", detalle: "La dirección puede usarse para calcular accesos y desplazamientos." });
  } else if (documento.tipo === "seguro") {
    impactos.push({ titulo: "Marcar cobertura del viaje", estado: "accion", detalle: "El seguro debe quedar asociado al viaje y sus viajeros, sin asumir qué cubre hasta revisar la documentación." });
    impactos.push({ titulo: "Revisar vigencia y cobertura", estado: "requiere-comprobacion", detalle: "Conviene comprobar fechas, destino y condiciones relevantes antes de considerarlo suficiente." });
  } else if (documento.tipo === "documento_personal") {
    impactos.push({ titulo: "Relacionar con requisitos", estado: "accion", detalle: "Este documento puede aportar evidencia para los requisitos de entrada o identificación." });
    impactos.push({ titulo: "No declarar cumplimiento automáticamente", estado: "requiere-comprobacion", detalle: "Tener el documento archivado no significa que cumpla todos los requisitos del destino." });
  } else if (documento.tipo === "entrada") {
    impactos.push({ titulo: "Añadir experiencia confirmada", estado: "accion", detalle: "La entrada puede convertirse en una actividad reservada cuando se pueda identificar su lugar y fecha." });
  } else {
    impactos.push({ titulo: "Analizar relación con el viaje", estado: "informativo", detalle: "El documento está archivado, pero todavía no se ha determinado qué decisión del viaje puede afectar." });
  }

  return impactos;
}
