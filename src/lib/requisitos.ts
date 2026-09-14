import { calcularEdad } from "./edad";
import { destinoPrincipal, paisPrincipal } from "./viaje";
import type { CategoriaRequisito, ResultadoRequisito, Viaje, Viajero } from "./types";

// Motor de requisitos de demostración: reglas heurísticas simplificadas.
// El objetivo es mostrar el patrón (🟢/🟡/🔴 por viajero, con motivo y
// fuente) — NO sustituye consulta de fuentes oficiales, que cambian con
// frecuencia y dependen de nacionalidad, residencia y fecha exacta del viaje.
const FUENTE_ORIENTATIVA =
  "Efecto Viajero estimate (unofficial) — verify with the destination country's official source before travelling.";

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

function evaluarPersona(viajero: import("./types").PersonaViajero, viaje: Viaje, paisCodigo?: string, enSchengen?: boolean) {
  const resultados: ResultadoRequisito[] = [];
  const edad = calcularEdad(viajero.fechaNacimiento);

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
        "No passport or ID card saved on this traveller's file. Add one so we can check it's still valid."
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
          "Passport may not have enough validity",
          "Many countries require at least 6 months' validity beyond your return date. Check the passport's expiry date."
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
        "There's a passport on file but no expiry date. Fill it in so we can check it automatically."
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
        "Destination inside the Schengen area: no visa needed for most European nationalities."
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
        "This destination may have recommended or mandatory vaccines depending on your itinerary and where you're coming from. Check with an international vaccination centre."
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
        "Check baby-specific documents",
        "Babies usually need their own passport and, in some cases, extra authorisation. Check the destination's specific requirement."
      )
    );
  } else if (edad !== null && edad < 18) {
    resultados.push(
      nuevoResultado(
        viajero,
        "documentacion",
        "amarillo",
        "Check the child's documents",
        "If the child travels without both parents, some countries require a travel authorisation. Check the destination's requirement."
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
        "An identifying microchip is mandatory to travel with a pet in most countries. Add it to their record."
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
        "Check rabies vaccination",
        "No rabies vaccination recorded. It's usually required at least 21 days before travel. Check and record it."
      )
    );
  } else {
    resultados.push(
      nuevoResultado(
        viajero,
        "mascota",
        "verde",
        "Rabies vaccination recorded",
        "A rabies vaccination is recorded on the pet's file."
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
        "Outside the Schengen area an additional official veterinary certificate is usually required. Check the destination's requirement in advance."
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
  // del país, así que basta con saber en cuál está la ciudad. El país ya
  // trae sus bloques (paises.ts es la fuente única de qué países están en
  // Schengen) — antes esto duplicaba esa lista aquí, incompleta y
  // desincronizada de la real.
  const pais = paisPrincipal(viaje);
  const paisCodigo = pais?.codigo;
  const enSchengen = pais ? pais.bloques?.includes("schengen") ?? false : undefined;
  const destino = destinoPrincipal(viaje);

  const viajerosDelViaje = viajeros.filter((v) => viaje.viajerosIds.includes(v.id));

  return viajerosDelViaje.flatMap((viajero) =>
    viajero.tipo === "persona"
      ? evaluarPersona(viajero, viaje, paisCodigo, enSchengen)
      : evaluarMascota(viajero, destino?.mascotaFriendly, enSchengen)
  );
}

export const ORDEN_ESTADO: Record<ResultadoRequisito["estado"], number> = {
  rojo: 0,
  amarillo: 1,
  verde: 2,
};
