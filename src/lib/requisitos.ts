import { calcularEdad } from "./edad";
import { destinoPrincipal, paisPrincipal } from "./viaje";
import type { CategoriaRequisito, ResultadoRequisito, Viaje, Viajero } from "./types";

// Motor de requisitos de demostración: reglas heurísticas simplificadas.
// El objetivo es mostrar el patrón (🟢/🟡/🔴 por viajero, con motivo y
// fuente) — NO sustituye consulta de fuentes oficiales, que cambian con
// frecuencia y dependen de nacionalidad, residencia y fecha exacta del viaje.
const FUENTE_ORIENTATIVA =
  "Estimación de Efecto Viajero (no oficial) — verificar en la fuente oficial del país de destino antes de viajar.";

const PAISES_ESPACIO_SCHENGEN = new Set(["SI", "AT", "DE", "PT", "IT", "ES", "GR", "FR", "NL"]);

function hoyISO() {
  return new Date().toISOString();
}

function nuevoResultado(
  viajero: Viajero,
  categoria: CategoriaRequisito,
  estado: ResultadoRequisito["estado"],
  titulo: string,
  motivo: string
): ResultadoRequisito {
  return {
    viajeroId: viajero.id,
    viajeroNombre: viajero.nombre,
    categoria,
    estado,
    titulo,
    motivo,
    fuente: FUENTE_ORIENTATIVA,
    fechaComprobacion: hoyISO(),
  };
}

function evaluarPersona(viajero: import("./types").PersonaViajero, viaje: Viaje, paisCodigo?: string) {
  const resultados: ResultadoRequisito[] = [];
  const edad = calcularEdad(viajero.fechaNacimiento);
  const enSchengen = paisCodigo ? PAISES_ESPACIO_SCHENGEN.has(paisCodigo) : undefined;

  // Documentación de viaje (pasaporte/DNI)
  const pasaporte = viajero.documentos.find((d) => d.tipo === "pasaporte");
  const dni = viajero.documentos.find((d) => d.tipo === "dni");
  if (!pasaporte && !dni) {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "amarillo",
        "Documento de viaje no registrado",
        "No hay pasaporte ni DNI guardado en la ficha de este viajero. Añádelo para poder comprobar vigencia."
      )
    );
  } else if (pasaporte?.fechaVencimiento && viaje.fechaRegreso) {
    const vencimiento = new Date(pasaporte.fechaVencimiento);
    const margenSeguridad = new Date(viaje.fechaRegreso);
    margenSeguridad.setMonth(margenSeguridad.getMonth() + 6);
    if (vencimiento < margenSeguridad) {
      resultados.push(
        nuevoResultado(
          viajero,
          "documentacion",
          "rojo",
          "Pasaporte podría no tener validez suficiente",
          "Muchos países exigen al menos 6 meses de validez tras la fecha de regreso. Revisa la fecha de vencimiento del pasaporte."
        )
      );
    } else {
      resultados.push(
        nuevoResultado(
          viajero,
          "documentacion",
          "verde",
          "Pasaporte con validez suficiente",
          "La fecha de vencimiento registrada supera el margen habitual de 6 meses tras el regreso."
        )
      );
    }
  } else if (!pasaporte?.fechaVencimiento) {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "amarillo",
        "Falta fecha de vencimiento del pasaporte",
        "Hay un pasaporte registrado pero sin fecha de vencimiento. Complétala para validar automáticamente."
      )
    );
  } else {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "amarillo",
        "Falta confirmar la fecha de regreso",
        "En cuanto el viaje tenga fecha de regreso, comprobamos si el pasaporte tiene validez suficiente."
      )
    );
  }

  // Visado
  if (enSchengen === true) {
    resultados.push(
      nuevoResultado(
        viajero,
        "visado",
        "verde",
        "Sin visado detectado para este destino",
        "Destino dentro del espacio Schengen: sin necesidad de visado para la mayoría de nacionalidades europeas."
      )
    );
  } else if (paisCodigo) {
    resultados.push(
      nuevoResultado(
        viajero,
        "visado",
        "amarillo",
        "Revisar requisito de visado",
        `El requisito de visado para entrar en este destino depende de la nacionalidad (${viajero.nacionalidad ?? "no indicada"}). Compruébalo antes de reservar vuelos.`
      )
    );
  }

  // Salud
  if (enSchengen === true) {
    resultados.push(
      nuevoResultado(
        viajero,
        "salud",
        "verde",
        "Sin vacunas obligatorias detectadas",
        "No se han detectado requisitos sanitarios obligatorios para este destino."
      )
    );
  } else if (paisCodigo) {
    resultados.push(
      nuevoResultado(
        viajero,
        "salud",
        "amarillo",
        "Revisar vacunas recomendadas",
        "Este destino puede tener vacunas recomendadas u obligatorias según itinerario y procedencia. Revisa con un centro de vacunación internacional."
      )
    );
  }

  // Menores
  if (edad !== null && edad < 2) {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "rojo",
        "Comprobar documentación específica de bebé",
        "Los bebés suelen necesitar pasaporte propio y, en algunos casos, autorización adicional. Revisa el requisito específico del destino."
      )
    );
  } else if (edad !== null && edad < 18) {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "amarillo",
        "Comprobar documentación de menor",
        "Si el menor viaja sin ambos progenitores, algunos países exigen autorización de viaje. Revisa el requisito del destino."
      )
    );
  }

  return resultados;
}

function evaluarMascota(viajero: import("./types").MascotaViajero, destinoMascotaFriendly?: boolean, enSchengen?: boolean) {
  const resultados: ResultadoRequisito[] = [];

  if (!viajero.microchip) {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "rojo",
        "Microchip no registrado",
        "El microchip identificativo es obligatorio para viajar con mascota en la mayoría de países. Añádelo a la ficha."
      )
    );
  } else {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "verde",
        "Microchip registrado",
        "La mascota tiene microchip registrado en su ficha."
      )
    );
  }

  const vacunaRabia = viajero.documentos.find(
    (d) => d.tipo === "vacuna" && (d.nombre ?? "").toLowerCase().includes("rabia")
  );
  if (!vacunaRabia) {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "amarillo",
        "Revisar vacuna antirrábica",
        "No hay vacuna antirrábica registrada. Suele exigirse al menos 21 días antes del viaje. Compruébalo y regístrala."
      )
    );
  } else {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "verde",
        "Vacuna antirrábica registrada",
        "Hay una vacuna antirrábica registrada en la ficha de la mascota."
      )
    );
  }

  if (enSchengen === false) {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "amarillo",
        "Certificado veterinario adicional",
        "Fuera del espacio Schengen suele exigirse certificado veterinario oficial adicional. Revisa el requisito del destino con antelación."
      )
    );
  }

  if (destinoMascotaFriendly === false) {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "rojo",
        "Destino con oferta limitada para mascotas",
        "Este destino tiene, en general, menos alojamientos y transporte que admiten mascotas. Revisa disponibilidad antes de reservar."
      )
    );
  }

  return resultados;
}

export function calcularRequisitos(viaje: Viaje, viajeros: Viajero[]): ResultadoRequisito[] {
  // Por país, no por destino curado: los requisitos de entrada dependen
  // del país, así que basta con saber en cuál está la ciudad.
  const paisCodigo = paisPrincipal(viaje)?.codigo;
  const enSchengen = paisCodigo ? PAISES_ESPACIO_SCHENGEN.has(paisCodigo) : undefined;
  const destino = destinoPrincipal(viaje);

  const viajerosDelViaje = viajeros.filter((v) => viaje.viajerosIds.includes(v.id));

  return viajerosDelViaje.flatMap((viajero) =>
    viajero.tipo === "persona"
      ? evaluarPersona(viajero, viaje, paisCodigo)
      : evaluarMascota(viajero, destino?.mascotaFriendly, enSchengen)
  );
}

export const ORDEN_ESTADO: Record<ResultadoRequisito["estado"], number> = {
  rojo: 0,
  amarillo: 1,
  verde: 2,
};
