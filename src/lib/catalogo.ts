import type { ActividadDestino, Destino, OpcionAlojamiento, SouvenirDestino } from "./types";

// El catálogo es orientativo (no sabemos el sitio exacto, su horario real
// ni su web oficial), así que en vez de inventarlos se da un enlace real
// de búsqueda: el usuario llega a información verdadera en un clic.
export function urlBuscarActividad(nombre: string, ciudad: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${nombre} en ${ciudad}`)}`;
}

export function urlMapsActividad(nombre: string, ciudad: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${nombre} en ${ciudad}`)}`;
}

// Qué comer o beber si no conoces la gastronomía local: reutiliza el
// mismo dato ya curado de souvenirs (que ya distingue comida/bebida típica
// por país) en vez de inventar una lista de platos aparte.
export function queProbarDe(pais: string): SouvenirDestino[] {
  return souvenirsDe(pais)
    .filter((s) => /café|vino|cerveza|whisky|té\b|aguardiente|gastronóm|licor/i.test(`${s.nombre} ${s.descripcion}`))
    .slice(0, 2);
}

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

  // Estas seis categorías existen en prácticamente cualquier ciudad, así
  // que van siempre, sin depender de tags del destino: es lo que el
  // viajero espera encontrar al organizar por categoría (museos, parques,
  // restaurantes, cine y teatro, discotecas, compras).
  const actividades: ActividadDestino[] = [
    {
      id: `${destino.id}-act-paseo`,
      nombre: `Paseo por el centro de ${destino.nombre}`,
      tipo: "cultura",
      categoria: "parque",
      duracionHoras: 2,
      costeEstimado: 0,
      apta: ["exterior", "familiar", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Callejear sin prisa por las zonas más características.",
    },
    {
      id: `${destino.id}-act-parque`,
      nombre: `Parque o zona verde de ${destino.nombre}`,
      tipo: "naturaleza",
      categoria: "parque",
      duracionHoras: 1.5,
      costeEstimado: 0,
      apta: ["exterior", "familiar", "tranquilo"],
      entorno: "exterior",
      admiteMascotas: conPerro,
      descripcion: "Aire libre y descanso entre planes, gratis y sin reserva.",
    },
    {
      id: `${destino.id}-act-restaurante`,
      nombre: "Restaurante de comida típica",
      tipo: "gastronomia",
      categoria: "restaurante",
      duracionHoras: 1.5,
      costeEstimado: Math.round(base * 0.15),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Probar los platos más representativos de la zona.",
    },
    {
      id: `${destino.id}-act-gastro`,
      nombre: "Ruta gastronómica local",
      tipo: "gastronomia",
      categoria: "restaurante",
      duracionHoras: 2.5,
      costeEstimado: Math.round(base * 0.2),
      apta: ["interior", "exterior", "familiar"],
      entorno: "mixto",
      admiteMascotas: false,
      descripcion: "Probar platos y productos típicos de varias paradas.",
    },
    {
      id: `${destino.id}-act-museo`,
      nombre: "Museo o centro cultural",
      tipo: "cultura",
      categoria: "museo",
      duracionHoras: 2,
      costeEstimado: Math.round(base * 0.1) + 5,
      apta: ["interior", "familiar"],
      entorno: "interior",
      admiteMascotas: false,
      descripcion: "Buena opción si hace mal tiempo.",
      consejo: "Muchos museos tienen un día o una franja horaria gratis a la semana o al mes: consúltalo en su web oficial antes de pagar la entrada.",
    },
    {
      id: `${destino.id}-act-teatro`,
      nombre: "Cine o teatro local",
      tipo: "cultura",
      categoria: "cine_teatro",
      duracionHoras: 2.5,
      costeEstimado: Math.round(base * 0.12) + 4,
      apta: ["interior", "familiar"],
      entorno: "interior",
      admiteMascotas: false,
      descripcion: "Cartelera o programación local, buena opción de noche o si llueve.",
      horarioHabitual: "Funciones habituales por la tarde-noche; confirma cartelera del día.",
    },
    {
      id: `${destino.id}-act-discoteca`,
      nombre: "Discoteca o vida nocturna popular",
      tipo: "ocio_nocturno",
      categoria: "discoteca",
      duracionHoras: 3,
      costeEstimado: Math.round(base * 0.15),
      apta: ["interior"],
      entorno: "interior",
      admiteMascotas: false,
      descripcion: "Zona de ambiente nocturno recomendada por locales.",
      horarioHabitual: "Suele animarse después de las 23:00.",
    },
    {
      id: `${destino.id}-act-mercado`,
      nombre: "Mercado y compras locales",
      tipo: "compras",
      categoria: "compras",
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
      categoria: "naturaleza",
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
      categoria: "playa",
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
      categoria: "pueblos",
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

// Consejos de compra a nivel país: antes pedía un Destino curado, así
// que en cualquier ciudad fuera del catálogo la pantalla quedaba vacía.
// Solo usaba el país, así que ahora recibe el país y ya está.
const SOUVENIRS_POR_PAIS: Record<string, SouvenirDestino[]> = {
  españa: [
    {
      id: "spain-sv-jamón",
      nombre: "Jamón Serrano o Jamón Ibérico",
      origen: "España",
      precioAprox: "15-60 €",
      descripcion: "Jamón curado tradicional, emblemático de España.",
      datoCurioso: "El jamón ibérico de bellota es el 'caviar español' — criado en libertad comiendo bellotas de robles, es más oscuro y con más infiltraciones de grasa que el serrano.",
      avisoEquipaje: "Va en la maleta facturada. Las aduanas de algunos países lo prohíben (incluyendo USA): confirma antes si vuelves a casa desde fuera.",
      historia: "Tradición de más de 500 años de curación lenta en las secadoras de la Península Ibérica, especialmente Sierra Morena.",
      dondéComprar: "Mercados locales, carnicerías tradicionales, tiendas especializadas en barrios antiguos.",
    },
    {
      id: "spain-sv-vino",
      nombre: "Vino Rioja o Ribera del Duero",
      origen: "España",
      precioAprox: "10-30 €",
      descripcion: "Vino tinto español de denominación de origen.",
      datoCurioso: "Las bodegas españolas usan barriles de roble que dan sabor diferente según si el roble es francés o americano.",
      avisoEquipaje: "Líquido en maleta facturada. Límite en cabina: 100 ml.",
      historia: "La región de Rioja es una de las más antiguas productoras de vino del mundo, con tradición desde el siglo XI.",
      ingredientes: ["Uva Tempranillo", "Mazuelo", "Graciano"],
      dondéComprar: "Tiendas de vinos, supermercados, bodegas locales.",
    },
    {
      id: "spain-sv-ceramica",
      nombre: "Cerámica de Talavera o Manises",
      origen: "España",
      precioAprox: "20-80 €",
      descripcion: "Cerámica pintada a mano con decoraciones azules y verdes.",
      datoCurioso: "La cerámica de Talavera es la más antigua de Europa, protegida como Patrimonio Inmaterial de la UNESCO.",
      avisoEquipaje: "Frágil: mejor en cabina bien embalada. En facturada hay riesgo alto de rotura.",
      historia: "Técnica traída por moriscos en el siglo XV, con 500 años de tradición ininterrumpida.",
      dondéComprar: "Tiendas de artesanía, museos con tienda, mercados artesanales en ciudades antiguas.",
    },
    {
      id: "spain-sv-mantilla",
      nombre: "Mantilla (encaje o seda negra)",
      origen: "España",
      precioAprox: "25-100 €",
      descripcion: "Pañuelo de encaje tradicional español para la cabeza.",
      datoCurioso: "Se usa en procesiones de Semana Santa y en corridas de toros. El encaje de calidad puede durar generaciones.",
      historia: "Prenda distintiva española desde el siglo XVI, símbolo de tradición y elegancia.",
      dondéComprar: "Tiendas de trajes tradicionales, mercados antiguos, tiendas de encajes artesanales.",
    },
  ],
  colombia: [
    {
      id: "colombia-sv-cafe",
      nombre: "Café Colombiano Premium",
      origen: "Colombia",
      precioAprox: "8-20 €",
      descripcion: "Café de alta montaña, grano entero o molido.",
      datoCurioso: "Colombia es el mayor productor mundial de café de sombra y especialidad. Cada región tiene su perfil: Geisha del Huila, Eje Cafetero, Nariño.",
      avisoEquipaje: "Lleva bien el viaje. Grano entero mejor que molido para mantener aroma.",
      historia: "Cultivado desde el siglo XVIII en las montañas andinas colombianas a entre 1200-2000m de altura.",
      ingredientes: ["Arabica de montaña", "sombra de plátano y nogal"],
      dondéComprar: "Fincas cafeteras (tours + venta), mercados locales, tiendas de artesanía.",
    },
    {
      id: "colombia-sv-mochilas",
      nombre: "Mochilas Wayuu o Molas",
      origen: "Colombia",
      precioAprox: "30-150 €",
      descripcion: "Bolsos tejidos a mano por comunidades indígenas.",
      datoCurioso: "Las mochilas Wayuu de La Guajira son tejidas completamente a mano con lanas de colores naturales. Cada patrón tiene significado simbólico.",
      avisoEquipaje: "Ligeras y resistentes, ideales para llevarse en cabina.",
      historia: "Tradición wayuu de más de 1000 años. Cada patrón cuenta una historia de la vida de la tejedora.",
      dondéComprar: "Mercados indígenas en Uribia, tiendas de artesanía en ciudades grandes, asociaciones de tejedoras.",
    },
    {
      id: "colombia-sv-oro",
      nombre: "Joyería de oro colombiano",
      origen: "Colombia",
      precioAprox: "50-500 €",
      descripcion: "Anillos, pulseras y collares en oro de ley.",
      datoCurioso: "Colombia es rica en oro de alta pureza. Los diseños tradicionales mezclan técnicas precolombinas con estilos modernos.",
      avisoEquipaje: "Decláralo al entrar/salir del país. Llévalo contigo en cabina.",
      historia: "Orfebrería precolombina + tradición colonial = joyas únicas con técnicas ancestrales.",
      dondéComprar: "Joyerías certificadas, tiendas en centros históricos, artesanos locales.",
    },
    {
      id: "colombia-sv-aguardiente",
      nombre: "Aguardiente Colombiano",
      origen: "Colombia",
      precioAprox: "10-25 €",
      descripcion: "Bebida alcohólica destilada, típicamente con anís.",
      datoCurioso: "El Aguardiente Antioqueño y el del Cauca son famosos. Se toma en celebraciones y es la bebida nacional.",
      avisoEquipaje: "Líquido: maleta facturada solamente.",
      historia: "Bebida de más de 400 años que mezcla tradición indígena con técnicas españolas de destilación.",
      ingredientes: ["Caña de azúcar", "anís", "especias"],
      dondéComprar: "Licorería, supermercados, tiendas de bebidas.",
    },
  ],
  "reino unido": [
    {
      id: "uk-sv-te",
      nombre: "Té Inglés Premium (Twinings, Fortnum & Mason)",
      origen: "Reino Unido",
      precioAprox: "5-25 €",
      descripcion: "Blends exclusivas de té negro y mezclas tradicionales británicas.",
      datoCurioso: "El té de las 5 es una tradición británica de 200 años. Fortnum & Mason es proveedor de la Familia Real.",
      avisoEquipaje: "Peso ligero, se transporta bien. No requiere declaración.",
      historia: "Tradición del té importado desde la India y Ceilán durante la época colonial, perfeccionada en Gran Bretaña.",
      ingredientes: ["Té negro Assam", "Darjeeling", "Earl Grey (con bergamota)"],
      dondéComprar: "Tiendas de marca en Londres, Harrods, Fortnum & Mason, tiendas de barrio tradicionales.",
    },
    {
      id: "uk-sv-whisky",
      nombre: "Whisky Escocés Single Malt",
      origen: "Escocia",
      precioAprox: "40-150 €",
      descripcion: "Whisky de destilería única, envejecido en barriles de roble.",
      datoCurioso: "Cada región escocesa (Islay, Speyside, Highlands) tiene características diferentes. Los de Islay son ahumados y turbosos.",
      avisoEquipaje: "Líquido: maleta facturada.",
      historia: "Destilación escocesa desde el siglo XV, perfeccionada durante siglos.",
      ingredientes: ["Cebada malteada", "agua de manantial escocesa", "turba"],
      dondéComprar: "Duty free, destilerías, tiendas especializadas en whisky.",
    },
    {
      id: "uk-sv-bisuteria",
      nombre: "Joyería de la Torre de Londres o Royal Mint",
      origen: "Reino Unido",
      precioAprox: "30-200 €",
      descripcion: "Accesorios inspirados en la herencia británica, monedas coleccionables.",
      datoCurioso: "Las coronas y insignias de la Torre de Londres son iconos mundialmente reconocidos.",
      historia: "Diseños basados en casi 1000 años de monarquía británica.",
      dondéComprar: "Tiendas oficiales en la Torre de Londres, Real Casa de Moneda, joyerías de lujo.",
    },
  ],
  alemania: [
    {
      id: "germany-sv-cerveza",
      nombre: "Cerveza Alemana Premium (Pilsner, Weizen)",
      origen: "Alemania",
      precioAprox: "5-20 € (botellas especiales o coleccionables)",
      descripcion: "Cervezas de calidad superior en botellas decorativas.",
      datoCurioso: "Baviera respeta la 'Ley de Pureza de la Cerveza' (Reinheitsgebot) desde 1516 — solo agua, cebada y lúpulo.",
      avisoEquipaje: "Pesado y frágil: mejor comprar localmente para beber o llevar a maleta facturada bien protegido.",
      historia: "Tradición cervecera de 1000 años. La Oktoberfest de Múnich es la fiesta de la cerveza más famosa del mundo.",
      ingredientes: ["Cebada malteada", "lúpulo alemán", "levadura de cervecería"],
      dondéComprar: "Cervecerías tradicionales, biergartens, tiendas de delicatessen.",
    },
    {
      id: "germany-sv-reloj",
      nombre: "Reloj Cuckoo (reloj de cuco) de la Selva Negra",
      origen: "Alemania (Selva Negra)",
      precioAprox: "50-300 €",
      descripcion: "Reloj mecánico tradicional con figuritas de madera que salen cada hora.",
      datoCurioso: "Cada hora el reloj toca una melodía y sale un cuclillo. Los mejores son tallados a mano. Un reloj de 80 años sigue funcionando.",
      avisoEquipaje: "Frágil y pesado: transporte en cabina o bien embalado.",
      historia: "Tradición de más de 300 años de la región de la Selva Negra. Técnica casi desaparecida, recuperada en últimas décadas.",
      dondéComprar: "Talleres artesanales en la Selva Negra, museos con tienda, tiendas especializadas.",
    },
    {
      id: "germany-sv-christmasdeco",
      nombre: "Decoraciones navideñas alemanas (Erzgebirge, bolas)",
      origen: "Alemania (Erzgebirge)",
      precioAprox: "5-50 €",
      descripcion: "Adornos navideños de vidrio soplado y figuras de madera tallada.",
      datoCurioso: "Las bolas de Navidad alemanas son una de las mejores del mundo. Los figuritas de madera son talladas en el corazón del país (Erzgebirge).",
      avisoEquipaje: "Frágil: bien embaladas en cabina.",
      historia: "Tradición navideña de más de 200 años. Las bolas de vidrio nacieron de una mala cosecha de nueces en 1847.",
      dondéComprar: "Mercadillos navideños (Weihnachtsmarkt), tiendas especializadas, artesanos locales.",
    },
  ],
};

export function souvenirsDe(nombrePais: string): SouvenirDestino[] {
  const paisClave = nombrePais.toLowerCase().trim();

  if (SOUVENIRS_POR_PAIS[paisClave]) {
    return SOUVENIRS_POR_PAIS[paisClave];
  }

  // Fallback: genérico para países no listados
  const destino = { id: paisClave.replace(/\s+/g, "-"), pais: nombrePais };
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
