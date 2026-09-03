import type { ActividadDestino, Destino, OpcionAlojamiento, SouvenirDestino, TransporteLocal } from "./types";

// Catálogo de demostración: se genera a partir de los atributos del
// destino en vez de mantener listas manuales por país. No sustituye una
// integración real con proveedores (eso es B20).
function semilla(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 97;
  return h;
}

export function alojamientosDe(destino: Destino): OpcionAlojamiento[] {
  const base = destino.presupuestoDiaEstimado.medio * 0.55;
  const s = semilla(destino.id);
  return [
    {
      id: `${destino.id}-aloj-centro`,
      nombre: `Alojamiento céntrico en ${destino.nombre}`,
      ubicacion: "centro",
      precioNoche: Math.round(base + (s % 10)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["A pie de todo", "Menos desplazamientos"],
      contras: ["El más caro de las tres opciones"],
    },
    {
      id: `${destino.id}-aloj-afueras`,
      nombre: `Alojamiento con encanto cerca de ${destino.nombre}`,
      ubicacion: "afueras",
      precioNoche: Math.round(base * 0.75 + (s % 6)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["Más barato", "Más tranquilo"],
      contras: ["Añade ~45 min de desplazamiento al día"],
    },
    {
      id: `${destino.id}-aloj-estacion`,
      nombre: "Alojamiento práctico junto a estación/aeropuerto",
      ubicacion: "cerca de estación/aeropuerto",
      precioNoche: Math.round(base * 0.9 + (s % 8)),
      mascotaFriendly: destino.mascotaFriendly,
      pros: ["Fácil llegar y salir"],
      contras: ["Menos ambiente alrededor"],
    },
  ];
}

export function actividadesDe(destino: Destino): ActividadDestino[] {
  const base = destino.presupuestoDiaEstimado.medio;
  // `admiteMascotas` no se inventa por actividad: depende de si el destino
  // es mascota-friendly Y de que la actividad sea de calle. Un museo no
  // admite perros aunque el país sí.
  const conPerro = destino.mascotaFriendly;

  const actividades: ActividadDestino[] = [
    {
      id: `${destino.id}-act-paseo`,
      nombre: `Paseo por el centro de ${destino.nombre}`,
      tipo: "cultura",
      duracionHoras: 2,
      costeEstimado: 0,
      apta: ["exterior", "familiar", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Callejear sin prisa por las zonas más características.",
    },
    {
      id: `${destino.id}-act-gastro`,
      nombre: "Ruta gastronómica local",
      tipo: "gastronomia",
      duracionHoras: 2.5,
      costeEstimado: Math.round(base * 0.2),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Probar platos y productos típicos de la zona.",
    },
    {
      id: `${destino.id}-act-museo`,
      nombre: "Museo o centro cultural",
      tipo: "cultura",
      duracionHoras: 2,
      costeEstimado: Math.round(base * 0.1) + 5,
      apta: ["interior", "familiar"],
      entorno: "interior",
      admiteMascotas: false,
      descripcion: "Buena opción si hace mal tiempo.",
    },
    {
      id: `${destino.id}-act-mercado`,
      nombre: "Mercado y compras locales",
      tipo: "compras",
      duracionHoras: 1.5,
      costeEstimado: Math.round(base * 0.08),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Artesanía y productos típicos.",
    },
  ];

  if (destino.tags.includes("naturaleza") || destino.tags.includes("montana")) {
    actividades.push({
      id: `${destino.id}-act-naturaleza`,
      nombre: `Ruta de senderismo cerca de ${destino.nombre}`,
      tipo: "naturaleza",
      duracionHoras: 4,
      costeEstimado: 0,
      apta: ["exterior"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Sendero accesible con buenas vistas.",
    });
  }
  if (destino.tags.includes("playa")) {
    actividades.push({
      id: `${destino.id}-act-playa`,
      nombre: "Tarde de playa",
      tipo: "playa",
      duracionHoras: 3,
      costeEstimado: 0,
      apta: ["exterior", "familiar"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Tiempo libre junto al mar. Muchas playas restringen perros en temporada alta: conviene comprobar la señalización.",
    });
  }
  if (destino.tags.includes("pueblos")) {
    actividades.push({
      id: `${destino.id}-act-pueblo`,
      nombre: "Excursión a un pueblo cercano",
      tipo: "pueblos",
      duracionHoras: 4,
      costeEstimado: Math.round(base * 0.05),
      apta: ["exterior", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Descubrir un pueblo tradicional a poca distancia.",
    });
  }

  return actividades;
}

export function souvenirsDe(destino: Destino): SouvenirDestino[] {
  return [
    {
      id: `${destino.id}-sv-gastro`,
      nombre: `Producto gastronómico típico de ${destino.pais}`,
      origen: destino.pais,
      precioAprox: "5-15 €",
      descripcion: "Fácil de transportar y siempre queda bien como regalo.",
      datoCurioso: `Muchos productos gastronómicos de ${destino.pais} llevan denominación de origen — mirar la etiqueta ayuda a saber si es realmente de la zona y no una copia genérica.`,
      avisoEquipaje: "Si es líquido (aceite, licor, salsas), va en la maleta facturada: en cabina el límite suele ser 100 ml por envase.",
    },
    {
      id: `${destino.id}-sv-artesania`,
      nombre: "Artesanía local",
      origen: destino.pais,
      precioAprox: "10-30 €",
      descripcion: "Producto hecho a mano representativo de la zona.",
      datoCurioso: "La artesanía tradicional suele llevar el sello del taller — preguntar por él ayuda a distinguir la pieza local de una reproducción importada en serie.",
      avisoEquipaje: "Si es de cerámica, cristal u otro material frágil, mejor en cabina y bien protegida: en la maleta facturada se rompe con facilidad.",
    },
    {
      id: `${destino.id}-sv-textil`,
      nombre: "Textil o accesorio con motivos locales",
      origen: destino.pais,
      precioAprox: "8-25 €",
      descripcion: "Buena opción para regalos variados.",
      datoCurioso: `Los colores y motivos de los textiles suelen tener un significado propio de la región — preguntar en el mismo puesto suele ser la mejor forma de conocerlo.`,
    },
  ];
}

// Transporte local por país: datos reales y estables (nombres de tarjetas,
// tipos de servicio, costumbres de pago), deliberadamente sin precios
// concretos porque cambian cada temporada. Lo que no se sabe con certeza
// no se rellena: el destino sin ficha cae en el consejo genérico.
const TRANSPORTE_LOCAL_POR_PAIS: Record<string, TransporteLocal> = {
  SI: {
    medios: ["Autobús urbano", "Tren regional", "Bici pública"],
    comoSePaga: "En Liubliana el bus urbano se paga con la tarjeta recargable Urbana (se compra en kioscos y máquinas); no se acepta efectivo a bordo.",
    apps: "Slovenske železnice para trenes; los buses interurbanos se compran en la estación.",
  },
  AT: {
    medios: ["Metro (U-Bahn)", "Tranvía", "Autobús", "Tren de cercanías (S-Bahn)"],
    comoSePaga: "Billete único válido para metro, tranvía y bus de la misma ciudad; hay abonos de 24/48/72 h que salen a cuenta desde el tercer viaje del día.",
    apps: "WienMobil en Viena; ÖBB para trenes entre ciudades.",
    aviso: "El acceso al andén suele no tener torno, pero hay revisores: viajar sin validar se multa.",
  },
  DE: {
    medios: ["Metro (U-Bahn)", "Cercanías (S-Bahn)", "Tranvía", "Autobús"],
    comoSePaga: "Billete por zonas válido para todos los medios de la red urbana. Para moverse por la región, el abono mensual de transporte regional (Deutschlandticket) suele salir más barato que los billetes sueltos.",
    apps: "DB Navigator para tren; MVV/MVG en Múnich.",
    aviso: "El billete de papel hay que validarlo en la máquina del andén antes de subir.",
  },
  PT: {
    medios: ["Autobús regional", "Tren de cercanías", "Taxi"],
    comoSePaga: "Tarjeta recargable Viva Viagem para bus y tren de cercanías; en el Algarve los buses regionales conectan los pueblos de la costa con frecuencias bajas fuera de temporada.",
    apps: "CP para trenes; Vamus Algarve para autobuses regionales.",
    aviso: "Fuera de verano muchas líneas reducen servicio: conviene mirar el horario del mismo día.",
  },
  IT: {
    medios: ["Autobús urbano", "Tranvía", "Tren regional"],
    comoSePaga: "Billete de bus/tranvía por tiempo (normalmente 90 min) que se compra antes de subir, en estancos o máquinas.",
    apps: "Trenitalia para tren regional entre ciudades.",
    aviso: "El billete de papel se valida en la máquina al subir; sin validar cuenta como no tenerlo.",
  },
  ES: {
    medios: ["Autobús urbano", "Metro", "Cercanías Renfe", "Tren de media distancia"],
    comoSePaga: "Tarjeta multiviaje o bono de 10 viajes, bastante más barata que el billete sencillo; Cercanías cubre los desplazamientos cortos entre ciudades cercanas.",
    apps: "Renfe Cercanías; la app de la empresa municipal de cada ciudad.",
  },
  CR: {
    medios: ["Autobús público", "Shuttle compartido", "Taxi / app"],
    comoSePaga: "El autobús público se paga en efectivo al conductor y es muy económico, pero lento y con paradas frecuentes. Los shuttles turísticos son puerta a puerta y bastante más caros.",
    apps: "Uber funciona en el área de San José.",
    aviso: "No hay metro ni tren turístico: casi todo el país se mueve en carretera y los tiempos reales superan lo que marca el mapa.",
  },
  MA: {
    medios: ["Petit taxi (urbano)", "Grand taxi (interurbano compartido)", "Tren ONCF", "Tranvía"],
    comoSePaga: "El petit taxi lleva taxímetro: conviene pedir que lo pongan antes de arrancar. El grand taxi es compartido y sale cuando se llena. El tren se compra en ventanilla o web de ONCF.",
    apps: "ONCF para trenes; hay tranvía en Casablanca y Rabat.",
    aviso: "El petit taxi no sale de los límites de la ciudad; para ir a otra ciudad es grand taxi o tren.",
  },
  TH: {
    medios: ["Metro elevado (BTS)", "Metro (MRT)", "Songthaew / tuk-tuk", "Barco por el río"],
    comoSePaga: "En Bangkok el BTS y el MRT funcionan con billete por trayecto o tarjeta recargable. Fuera de la capital, songthaews y tuk-tuks son a precio acordado antes de subir.",
    apps: "Grab para coche y moto-taxi con precio cerrado.",
    aviso: "El taxi con taxímetro es barato, pero hay que pedir expresamente que lo active.",
  },
  GR: {
    medios: ["Ferry entre islas", "Autobús KTEL", "Metro (Atenas)"],
    comoSePaga: "Los ferries se compran por web o en agencias del puerto; los autobuses interurbanos KTEL, en la estación. En Atenas hay billete integrado de metro/bus.",
    apps: "Compañías de ferry por ruta; no hay una única app oficial.",
    aviso: "En julio y agosto los ferries se llenan: reservar con antelación evita quedarse en tierra, y el mal tiempo puede cancelar salidas.",
  },
  CO: {
    medios: ["Metro y Metrocable (Medellín)", "TransMilenio (Bogotá)", "Autobús intermunicipal", "Taxi / app"],
    comoSePaga: "Tarjeta recargable en cada ciudad: Cívica en Medellín, Tullave en Bogotá. Los buses intermunicipales se compran en la terminal.",
    apps: "Uber y DiDi funcionan en las ciudades grandes.",
  },
  JP: {
    medios: ["Metro", "Tren urbano JR", "Shinkansen (alta velocidad)", "Autobús urbano"],
    comoSePaga: "Tarjeta IC recargable (Suica, Pasmo, ICOCA) válida en metro, tren urbano, bus y hasta en tiendas de conveniencia: se pasa al entrar y al salir. El shinkansen va aparte, con reserva de asiento.",
    apps: "Google Maps funciona muy bien con horarios reales de tren en Japón.",
    aviso: "El abono JR Pass solo sale a cuenta si se van a hacer varios trayectos largos entre ciudades; para un solo destino, no.",
  },
};

const TRANSPORTE_LOCAL_GENERICO: TransporteLocal = {
  medios: ["Transporte público urbano", "Taxi o app de coche"],
  comoSePaga: "Mirar al llegar si hay tarjeta recargable o abono de varios viajes: casi siempre sale más barato que comprar billete sencillo cada vez.",
  aviso: "No tenemos ficha verificada de transporte local para este destino: confirma en la estación o en la oficina de turismo al llegar.",
};

export function transporteLocalDe(destino: Destino): TransporteLocal {
  return TRANSPORTE_LOCAL_POR_PAIS[destino.paisCodigo] ?? TRANSPORTE_LOCAL_GENERICO;
}
