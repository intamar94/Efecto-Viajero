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

// Enlaces conocidos de las apps de transporte más comunes. Antes se
// mostraban solo como texto plano ("Uber", "DiDi"...): el viajero tenía que
// buscarlas él mismo. Con esto son un botón real a la web de la app; si no
// la conocemos, cae a una búsqueda en Google Play en vez de un enlace roto.
const ENLACES_APPS: Record<string, string> = {
  Uber: "https://www.uber.com/global/es/ride/",
  DiDi: "https://www.didiglobal.com/",
  Cabify: "https://cabify.com/",
  Bolt: "https://bolt.eu/",
  Grab: "https://www.grab.com/",
  Citymapper: "https://citymapper.com/",
  "Google Maps": "https://maps.google.com/",
  "TMB App": "https://www.tmb.cat/es/barcelona/tmb-app",
};

export function urlApp(nombreConNotas: string): string {
  const nombre = nombreConNotas.replace(/\s*\(.*\)\s*$/, "").trim();
  return ENLACES_APPS[nombre] ?? `https://play.google.com/store/search?q=${encodeURIComponent(nombre)}`;
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
        comoFunciona: "Bus rapid transit with dedicated lanes. Large stations, a rechargeable card is required.",
      },
      {
        nombre: "Regular city bus",
        tipo: "bus",
        comoFunciona: "Regular bus routes. You pay cash as you board.",
      },
      {
        nombre: "Cercanías (regional train)",
        tipo: "tren",
        comoFunciona: "Commuter trains to nearby towns. They leave from the central station.",
      },
      {
        nombre: "Taxi / app",
        tipo: "taxi",
        comoFunciona: "Yellow taxis with a meter. Apps: Uber, DiDi.",
      },
      {
        nombre: "On foot / bike lane",
        tipo: "a_pie",
        comoFunciona: "The centre is walkable. There are bike lanes on many avenues.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "Tullave",
        ciudades: ["Bogotá"],
        donde: "Kioscos en estaciones TransMilenio, supermercados, tiendas de conveniencia",
        precio: "Desde $3.000 COP",
        detalles: "Top it up at machines and kiosks. Valid on TransMilenio and city buses.",
      },
    ],
    apps: ["Uber", "DiDi"],
    sitiosOficiales: ["https://www.transmilenio.gov.co", "https://www.bogota.gov.co/transporte"],
    precios: {
      viajeSencillo: "Tullave: ~$3.000 COP",
      abonoDescargas: "10 rides: ~$30,000 COP (cheaper than singles)",
      nota: "Prices change month to month. Check at the station.",
    },
    aviso:
      "At 2,650 m altitude: thin air can cause altitude sickness. Take the first day slowly. Avoid transport at rush hour (7-9am, 4-6pm).",
  },

  medellin: {
    ciudad: "Medellín",
    pais: "Colombia",
    medios: [
      {
        nombre: "Metro de Medellín",
        tipo: "metro",
        comoFunciona: "Underground metro with several lines. Well-signposted stations. A rechargeable card is required.",
      },
      {
        nombre: "Metrocable",
        tipo: "tranvia",
        comoFunciona: "Cable car up the mountainsides where people live. Unique in South America as urban transport.",
      },
      {
        nombre: "Tranvía",
        tipo: "tranvia",
        comoFunciona: "Historic tram in the central area (Metro line K).",
      },
      {
        nombre: "City bus",
        tipo: "bus",
        comoFunciona: "Regular bus routes. Cash as you board.",
      },
      {
        nombre: "Taxi / app",
        tipo: "taxi",
        comoFunciona: "Yellow taxis with a meter. Apps: Uber, DiDi.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "Cívica",
        ciudades: ["Medellín"],
        donde: "Kioscos en estaciones de Metro, farmacias, tiendas",
        precio: "Desde $3.100 COP",
        detalles: "Valid on metro, Metrocable and integrated buses. Top it up at machines and kiosks.",
      },
    ],
    apps: ["Uber", "DiDi"],
    sitiosOficiales: ["https://www.metrodemedellin.gov.co"],
    precios: {
      viajeSencillo: "Cívica: ~$3,100 COP (one ride)",
      abonoDescargas: "Rechargeable card: discount by top-up amount (10+ rides work out cheaper)",
      nota: "El Metrocable es GRATIS si tienes la tarjeta del Metro.",
    },
    aviso:
      "The Metrocable is unique in the world as urban transport. Avoid rush hour. The city is built on mountainside: a lot of up and down on foot.",
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
        comoFunciona: "Yellow taxis. Always ask them to run the meter.",
      },
      {
        nombre: "A pie",
        tipo: "a_pie",
        comoFunciona: "La ciudad amurallada es 100% caminable. Las distancias son cortas.",
      },
      {
        nombre: "Bicitaxi / carruaje",
        tipo: "otro",
        comoFunciona: "Tourist transport. Agree the price before getting in.",
      },
    ],
    tarjetasYAbonos: [],
    apps: ["Uber (limitado)"],
    precios: {
      viajeSencillo: "Bus: ~$2.850 COP",
      abonoDescargas: "No hay tarjeta recargable. Paga en efectivo cada viaje.",
    },
    aviso: "The walled city is small: you can cover it on foot. A taxi may charge you more if they spot you're a tourist: agree the price first.",
  },

  // ESPAÑA
  madrid: {
    ciudad: "Madrid",
    pais: "España",
    medios: [
      {
        nombre: "Metro",
        tipo: "metro",
        comoFunciona: "Modern, clean metro with 12 lines. It's the fastest way around.",
      },
      {
        nombre: "City bus",
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
        detalles: "Valid on metro, bus and Cercanías. 10-ride versions also available.",
      },
      {
        nombre: "Bonobús (10 rides)",
        ciudades: ["Madrid"],
        donde: "Ticket machines, kiosks",
        precio: "~€15-20",
        detalles: "Para Metro y bus. Se puede compartir entre varias personas.",
      },
    ],
    apps: ["Citymapper", "Google Maps", "App del Metro"],
    sitiosOficiales: ["https://www.crtm.es", "https://www.metromadrid.es"],
    precios: {
      viajeSencillo: "Billete sencillo: ~€2.60",
      abonoDescargas: "Bonobús 10 rides: ~€18 (cheaper than singles)",
      nota: "There are fare zones. Most sights are in zone A (centre).",
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
        comoFunciona: "Metro with several lines. It's the most used option.",
      },
      {
        nombre: "City bus",
        tipo: "bus",
        comoFunciona: "Buses de la TMB. Tarjeta recargable.",
      },
      {
        nombre: "Tranvía",
        tipo: "tranvia",
        comoFunciona: "Trams in some areas (Gràcia and others).",
      },
      {
        nombre: "A pie",
        tipo: "a_pie",
        comoFunciona: "The Gothic Quarter and La Rambla are walkable. But the city is big.",
      },
    ],
    tarjetasYAbonos: [
      {
        nombre: "T-Casual (10 viajes)",
        ciudades: ["Barcelona"],
        donde: "Metro machines, stations, ticket machines",
        precio: "~€11.35 (zona 1)",
        detalles: "Can be shared. Valid on metro, bus and tram.",
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

// Los medios de transporte de un país vienen etiquetados con la ciudad
// donde existen ("Metro y Metrocable (Medellín)", "TransMilenio
// (Bogotá)"). Volcarlos tal cual en la ficha de OTRA ciudad es
// desinformar: en un viaje a Cali salía el metro de Medellín y el
// TransMilenio de Bogotá, que están a cientos de kilómetros.
//
// Se devuelve lo que de verdad sirve en ESA ciudad: primero lo que está
// etiquetado para ella, luego lo genérico del país (taxi, colectivo,
// autobús intermunicipal), y nunca lo etiquetado para otra ciudad.
export function mediosUtilesEnCiudad(medios: string[], ciudad?: string): string[] {
  const normalizada = ciudad
    ? ciudad.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    : "";
  return medios.filter((medio) => {
    const etiqueta = medio.match(/\(([^)]+)\)\s*$/);
    if (!etiqueta) return true; // Genérico del país: sirve en cualquier ciudad.
    if (!normalizada) return false; // Sin saber la ciudad, no arriesgamos.
    const ciudadDelMedio = etiqueta[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return ciudadDelMedio.includes(normalizada) || normalizada.includes(ciudadDelMedio);
  });
}
