// Transporte local detallado por ciudad.
// Estructura: por país > por ciudad, con detalles reales de cómo moverse.

export interface MediaTransporte {
  nombre: string; // "Metro", "Metrocable", "TransMilenio", etc
  tipo: "metro" | "tren" | "bus" | "tranvia" | "ferry" | "taxi" | "a_pie" | "otro";
  comoFunciona: string; // Descripción breve
}

export interface TarjetaOAbono {
  nombre: string; // "Cívica", "Tullave", etc
  ciudades?: string[]; // Qué ciudades la usan
  donde: string; // Dónde recargarla
  precio?: string; // Rango de precio
  detalles?: string;
}

export interface TransporteLocalDetallado {
  ciudad: string; // "Bogotá", "Medellín", etc
  pais: string; // "Colombia", "España", etc
  medios: MediaTransporte[];
  tarjetasYAbonos: TarjetaOAbono[];
  apps?: string[]; // ["Uber", "DiDi", etc]
  sitiosOficiales?: string[]; // URLs de transporte público
  aviso?: string; // Recomendación importante
  precios?: {
    viajeSencillo?: string;
    abonoDescargas?: string;
    nota?: string;
  };
}

// Base de datos de transporte local por ciudad
export const TRANSPORTE_LOCAL_POR_CIUDAD: Record<string, TransporteLocalDetallado> = {
  // COLOMBIA
  bogota: {
    ciudad: "Bogotá",
    pais: "Colombia",
    medios: [
      {
        nombre: "TransMilenio",
        tipo: "bus",
        comoFunciona: "Sistema de autobús rápido con carriles exclusivos. Estaciones grandes, tarjeta recargable obligatoria.",
      },
      {
        nombre: "Autobús urbano normal",
        tipo: "bus",
        comoFunciona: "Buses de líneas regulares. Se paga en efectivo al subir.",
      },
      {
        nombre: "Cercanías (tren regional)",
        tipo: "tren",
        comoFunciona: "Trenes de cercanías a pueblos cercanos. Salida desde la estación central.",
      },
      {
        nombre: "Taxi / app",
        tipo: "taxi",
        comoFunciona: "Taxis amarillos con taxímetro. Apps: Uber, DiDi.",
      },
      {
        nombre: "A pie / ciclovía",
        tipo: "a_pie",
        comoFunciona: "El centro es caminable. Hay ciclovías en muchas avenidas.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "Tullave",
        ciudades: ["Bogotá"],
        donde: "Kioscos en estaciones TransMilenio, supermercados, tiendas de conveniencia",
        precio: "Desde $3.000 COP",
        detalles: "Se recarga en máquinas y kioscos. Válida para TransMilenio y buses urbanos.",
      },
    ],
    apps: ["Uber", "DiDi", "Spotify"],
    sitiosOficiales: ["https://www.transmilenio.gov.co", "https://www.bogota.gov.co/transporte"],
    precios: {
      viajeSencillo: "Tullave: ~$3.000 COP",
      abonoDescargas: "10 viajes: ~$30.000 COP (más barato que individual)",
      nota: "Los precios varían por mes. Confirma en la estación.",
    },
    aviso:
      "A 2.650m de altura: la falta de oxígeno puede causar soroche. Tómate el primer día con calma. Evita el transporte a horas pico (7-9am, 4-6pm).",
  },

  medellin: {
    ciudad: "Medellín",
    pais: "Colombia",
    medios: [
      {
        nombre: "Metro de Medellín",
        tipo: "metro",
        comoFunciona: "Metro subterráneo con varias líneas. Estaciones bien señalizadas. Tarjeta recargable obligatoria.",
      },
      {
        nombre: "Metrocable",
        tipo: "tranvia",
        comoFunciona: "Teleférico que sube las montañas donde vive la gente. Único en América del Sur para transporte urbano.",
      },
      {
        nombre: "Tranvía",
        tipo: "tranvia",
        comoFunciona: "Tranvía histórico en la zona central (Línea K del Metro).",
      },
      {
        nombre: "Autobús urbano",
        tipo: "bus",
        comoFunciona: "Buses de líneas regulares. Efectivo al subir.",
      },
      {
        nombre: "Taxi / app",
        tipo: "taxi",
        comoFunciona: "Taxis amarillos con taxímetro. Apps: Uber, DiDi.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "Cívica",
        ciudades: ["Medellín"],
        donde: "Kioscos en estaciones de Metro, farmacias, tiendas",
        precio: "Desde $3.100 COP",
        detalles: "Válida para Metro, Metrocable, buses integrados. Se recarga en máquinas y kioscos.",
      },
    ],
    apps: ["Uber", "DiDi"],
    sitiosOficiales: ["https://www.metrodemedellin.gov.co"],
    precios: {
      viajeSencillo: "Cívica: ~$3.100 COP (un viaje)",
      abonoDescargas: "Tarjeta recargable: descuento según recarga (10+ viajes salen más baratos)",
      nota: "El Metrocable es GRATIS si tienes la tarjeta del Metro.",
    },
    aviso:
      "El Metrocable es único en el mundo para transporte urbano. Evita las horas pico. La ciudad está construida en montaña: mucho desnivel al caminar.",
  },

  cartagena: {
    ciudad: "Cartagena",
    pais: "Colombia",
    medios: [
      {
        nombre: "Autobús local",
        tipo: "bus",
        comoFunciona: "Buses coloridos. Se paga en efectivo al subir.",
      },
      {
        nombre: "Taxi",
        tipo: "taxi",
        comoFunciona: "Taxis amarillos. Siempre pide que pongan el taxímetro.",
      },
      {
        nombre: "A pie",
        tipo: "a_pie",
        comoFunciona: "La ciudad amurallada es 100% caminable. Las distancias son cortas.",
      },
      {
        nombre: "Bicitaxi / carruaje",
        tipo: "otro",
        comoFunciona: "Transporte turístico. Negocia precio antes de subir.",
      },
    ],
    tarjetasYAbonos: [],
    apps: ["Uber (limitado)"],
    precios: {
      viajeSencillo: "Bus: ~$2.850 COP",
      abonoDescargas: "No hay tarjeta recargable. Paga en efectivo cada viaje.",
    },
    aviso: "La ciudad amurallada es pequeña: puedes recorrerla caminando. El taxi puede cobrarte más si ve que eres turista: negocia el precio antes.",
  },

  // ESPAÑA
  madrid: {
    ciudad: "Madrid",
    pais: "España",
    medios: [
      {
        nombre: "Metro",
        tipo: "metro",
        comoFunciona: "Metro moderno y limpio con 12 líneas. Es lo más rápido para moverse.",
      },
      {
        nombre: "Autobús urbano",
        tipo: "bus",
        comoFunciona: "Red de autobuses amplia. Se paga con tarjeta o billete.",
      },
      {
        nombre: "Cercanías Renfe",
        tipo: "tren",
        comoFunciona: "Trenes regionales a pueblos cercanos (Toledo, Segovia, etc).",
      },
      {
        nombre: "A pie",
        tipo: "a_pie",
        comoFunciona: "El centro es muy caminable. Calles peatonales y parques.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "Abono Transporte (Zona A)",
        ciudades: ["Madrid"],
        donde: "Estaciones de Metro, puestos de venta autorizados",
        precio: "~€50-70/mes (depende de zonas)",
        detalles: "Válido para Metro, bus y Cercanías. Versiones de 10 viajes también disponibles.",
      },
      {
        nombre: "Bonobús (10 viajes)",
        ciudades: ["Madrid"],
        donde: "Máquinas de venta, kioscos",
        precio: "~€15-20",
        detalles: "Para Metro y bus. Se puede compartir entre varias personas.",
      },
    ],
    apps: ["Citymapper", "Google Maps", "App del Metro"],
    sitiosOficiales: ["https://www.crtm.es", "https://www.metromadrid.es"],
    precios: {
      viajeSencillo: "Billete sencillo: ~€2.60",
      abonoDescargas: "Bonobús 10 viajes: ~€18 (más barato que sencillos)",
      nota: "Hay zonas. La mayoría de turismo está en zona A (centro).",
    },
    aviso: "El Metro cierra a las 1:30am. Hay autobuses nocturnos pero menos frecuencia. Madrid es muy transitables a pie.",
  },

  barcelona: {
    ciudad: "Barcelona",
    pais: "España",
    medios: [
      {
        nombre: "Metro (TMB)",
        tipo: "metro",
        comoFunciona: "Metro con varias líneas. Es el medio más usado.",
      },
      {
        nombre: "Autobús urbano",
        tipo: "bus",
        comoFunciona: "Buses de la TMB. Tarjeta recargable.",
      },
      {
        nombre: "Tranvía",
        tipo: "tranvia",
        comoFunciona: "Tranvías en algunas zonas (Gracia, etc).",
      },
      {
        nombre: "A pie",
        tipo: "a_pie",
        comoFunciona: "El Gótico y la Rambla son caminables. Pero la ciudad es grande.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "T-Casual (10 viajes)",
        ciudades: ["Barcelona"],
        donde: "Máquinas de Metro, estaciones, máquinas de venta",
        precio: "~€11.35 (zona 1)",
        detalles: "Se puede compartir. Válida para Metro, bus, tranvía.",
      },
    ],
    apps: ["Citymapper", "TMB App"],
    sitiosOficiales: ["https://www.tmb.cat"],
    precios: {
      viajeSencillo: "Billete sencillo: ~€2.45",
      abonoDescargas: "T-Casual 10 viajes: ~€11.35",
    },
    aviso:
      "Barcelona es grande. No intentes hacer todo a pie. El Metro es eficiente. La Rambla tiene muchos carteristas: bolsa al frente.",
  },
};

// Función para obtener transporte de una ciudad
export function obtenerTransporteLocal(ciudad?: string): TransporteLocalDetallado | undefined {
  if (!ciudad) return undefined;
  const clave = ciudad.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return TRANSPORTE_LOCAL_POR_CIUDAD[clave];
}

// Función para buscar ciudades disponibles
export function ciudadesConTransporte(): string[] {
  return Object.values(TRANSPORTE_LOCAL_POR_CIUDAD).map((t) => t.ciudad);
}
