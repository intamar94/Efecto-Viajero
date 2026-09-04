import type { TransporteLocal } from "./types";

// Capa de PAÍS, separada de la de destino curado.
//
// Casi todo lo que la app sabe es de país, no de ciudad: emergencias,
// moneda, transporte local, reglas de frontera, visados. Mientras eso
// vivió pegado a una lista de 12 destinos, escribir "Pereira" dejaba la
// app entera vacía. Con esta capa, resolver la ciudad a su país basta
// para que casi todo funcione.
//
// Regla de honestidad: los números de emergencia solo se rellenan cuando
// hay certeza. Un teléfono de emergencias equivocado es peor que no dar
// ninguno, así que el resto se queda sin número y la pantalla lo dice.

export type BloqueRegional = "schengen" | "ue" | "mercosur" | "can" | "ca4";

export interface Pais {
  codigo: string; // ISO 3166-1 alfa-2
  nombre: string;
  alias?: string[];
  moneda?: string;
  emergencias?: string;
  telefonoTurista?: string;
  autoridad?: { nombre: string; url: string };
  bloques?: BloqueRegional[];
  transporteLocal?: TransporteLocal;
}

export const ETIQUETA_BLOQUE: Record<BloqueRegional, string> = {
  schengen: "Espacio Schengen",
  ue: "Unión Europea",
  mercosur: "Mercosur y asociados",
  can: "Comunidad Andina",
  ca4: "CA-4 (Centroamérica)",
};

// Qué implica de verdad compartir bloque al cruzar una frontera. Se
// redacta con la condición explícita (depende de la nacionalidad del
// viajero, no del viaje) para no prometer lo que no aplica a todos.
export const REGLA_BLOQUE: Record<BloqueRegional, string> = {
  schengen:
    "Frontera interior del espacio Schengen: normalmente no hay control de pasaportes al cruzar, aunque un país puede reinstaurarlos temporalmente. Lleva igualmente tu documento encima.",
  ue: "Ambos son de la Unión Europea: mismas normas de consumidor y de itinerancia móvil, y trámites aduaneros mínimos entre ellos.",
  mercosur:
    "Ambos pertenecen al acuerdo Mercosur y asociados: si eres ciudadano de uno de esos países, sueles poder entrar con la cédula o el DNI, sin pasaporte. Si tu nacionalidad es de fuera, no te aplica.",
  can: "Ambos son de la Comunidad Andina: si eres ciudadano andino, el documento de identidad nacional suele bastar para entrar, y la estancia como turista es amplia.",
  ca4: "Ambos están en el CA-4: para sus propios ciudadanos el movimiento es libre, y para el resto de turistas el plazo de estancia suele contarse de forma conjunta entre los cuatro países, no reiniciarse en cada frontera.",
};

const TRANSPORTE: Record<string, TransporteLocal> = {
  CO: {
    medios: ["Metro y Metrocable (Medellín)", "TransMilenio (Bogotá)", "Autobús intermunicipal", "Taxi / app", "Colectivo o buseta"],
    comoSePaga:
      "Tarjeta recargable en cada ciudad: Cívica en Medellín, Tullave en Bogotá. Entre ciudades se viaja en bus desde la terminal, y en pueblos pequeños con busetas y colectivos que se pagan en efectivo al subir.",
    apps: "Uber y DiDi en las ciudades grandes.",
    aviso: "Las distancias por carretera engañan: la montaña hace que 200 km puedan ser 5 o 6 horas.",
  },
  SI: {
    medios: ["Autobús urbano", "Tren regional", "Bici pública"],
    comoSePaga: "En Liubliana el bus urbano se paga con la tarjeta recargable Urbana (kioscos y máquinas); no se acepta efectivo a bordo.",
    apps: "Slovenske železnice para trenes; los buses interurbanos se compran en la estación.",
  },
  AT: {
    medios: ["Metro (U-Bahn)", "Tranvía", "Autobús", "Cercanías (S-Bahn)"],
    comoSePaga: "Billete único válido para metro, tranvía y bus de la misma ciudad; los abonos de 24/48/72 h salen a cuenta desde el tercer viaje del día.",
    apps: "WienMobil en Viena; ÖBB para trenes entre ciudades.",
    aviso: "El andén no suele tener torno, pero hay revisores: viajar sin validar se multa.",
  },
  DE: {
    medios: ["Metro (U-Bahn)", "Cercanías (S-Bahn)", "Tranvía", "Autobús"],
    comoSePaga:
      "Billete por zonas válido para todos los medios urbanos. Para moverse por la región, el abono mensual de transporte regional (Deutschlandticket) suele salir más barato que los billetes sueltos.",
    apps: "DB Navigator para tren; MVV/MVG en Múnich.",
    aviso: "El billete de papel hay que validarlo en la máquina del andén antes de subir.",
  },
  PT: {
    medios: ["Autobús regional", "Tren de cercanías", "Metro (Lisboa y Oporto)", "Taxi"],
    comoSePaga: "Tarjeta recargable Viva Viagem para bus, metro y cercanías.",
    apps: "CP para trenes; Vamus Algarve para autobuses regionales.",
    aviso: "Fuera de verano muchas líneas regionales reducen servicio: mira el horario del mismo día.",
  },
  IT: {
    medios: ["Autobús urbano", "Tranvía", "Metro", "Tren regional"],
    comoSePaga: "Billete de bus/tranvía por tiempo (normalmente 90 min), que se compra antes de subir en estancos o máquinas.",
    apps: "Trenitalia e Italo para trenes entre ciudades.",
    aviso: "El billete de papel se valida en la máquina al subir; sin validar cuenta como no tenerlo.",
  },
  ES: {
    medios: ["Metro", "Autobús urbano", "Cercanías Renfe", "Tren de media distancia"],
    comoSePaga: "Tarjeta multiviaje o bono de 10 viajes, bastante más barato que el billete sencillo; Cercanías cubre los trayectos cortos entre ciudades cercanas.",
    apps: "Renfe Cercanías; la app de la empresa municipal de cada ciudad.",
  },
  CR: {
    medios: ["Autobús público", "Shuttle compartido", "Taxi / app"],
    comoSePaga: "El bus público se paga en efectivo al conductor y es muy económico, pero lento. Los shuttles turísticos son puerta a puerta y bastante más caros.",
    apps: "Uber funciona en el área de San José.",
    aviso: "No hay tren turístico ni metro: casi todo se mueve por carretera y los tiempos reales superan lo que marca el mapa.",
  },
  MA: {
    medios: ["Petit taxi (urbano)", "Grand taxi (interurbano compartido)", "Tren ONCF", "Tranvía"],
    comoSePaga: "El petit taxi lleva taxímetro: pide que lo pongan antes de arrancar. El grand taxi es compartido y sale cuando se llena. El tren, en ventanilla o web de ONCF.",
    apps: "ONCF para trenes; hay tranvía en Casablanca y Rabat.",
    aviso: "El petit taxi no sale de los límites de la ciudad: para ir a otra, grand taxi o tren.",
  },
  TH: {
    medios: ["Metro elevado (BTS)", "Metro (MRT)", "Songthaew / tuk-tuk", "Barco por el río"],
    comoSePaga: "En Bangkok, billete por trayecto o tarjeta recargable. Fuera de la capital, songthaews y tuk-tuks a precio acordado antes de subir.",
    apps: "Grab para coche y moto-taxi con precio cerrado.",
    aviso: "El taxi con taxímetro es barato, pero hay que pedir expresamente que lo activen.",
  },
  GR: {
    medios: ["Ferry entre islas", "Autobús KTEL", "Metro (Atenas)"],
    comoSePaga: "Los ferries, por web o en agencias del puerto; los autobuses interurbanos KTEL, en la estación. En Atenas hay billete integrado de metro y bus.",
    aviso: "En julio y agosto los ferries se llenan: reservar con antelación evita quedarse en tierra, y el mal tiempo puede cancelar salidas.",
  },
  JP: {
    medios: ["Metro", "Tren urbano JR", "Shinkansen", "Autobús urbano"],
    comoSePaga:
      "Tarjeta IC recargable (Suica, Pasmo, ICOCA) válida en metro, tren urbano, bus y tiendas de conveniencia: se pasa al entrar y al salir. El shinkansen va aparte, con reserva de asiento.",
    apps: "Google Maps funciona muy bien con horarios reales de tren en Japón.",
    aviso: "El JR Pass solo sale a cuenta con varios trayectos largos entre ciudades; para un solo destino, no.",
  },
  PE: {
    medios: ["Autobús interprovincial", "Combi y colectivo", "Metropolitano (Lima)", "Tren a Machu Picchu"],
    comoSePaga: "Los buses largos se compran por web o en terminal, con categorías de asiento. Combis y colectivos, en efectivo al subir.",
    apps: "Uber, Cabify y DiDi en Lima.",
    aviso: "El tren a Machu Picchu (PeruRail o IncaRail) se agota en temporada alta: cómpralo con semanas de antelación.",
  },
  BO: {
    medios: ["Autobús interdepartamental (flota)", "Minibús urbano", "Teleférico (La Paz)", "Trufi"],
    comoSePaga: "En efectivo casi todo. El teleférico de La Paz tiene billete propio y es transporte diario, no solo turístico.",
    aviso: "La altura de La Paz y el altiplano pasa factura: los primeros días conviene bajar el ritmo.",
  },
  CL: {
    medios: ["Metro (Santiago)", "Autobús interurbano", "Micro urbana", "Colectivo"],
    comoSePaga: "Tarjeta bip! en Santiago para metro y micros. Los buses entre ciudades se compran en terminal o web.",
    apps: "Uber, Cabify y DiDi en las ciudades grandes.",
    aviso: "El país es larguísimo: entre el norte y el sur casi siempre compensa volar en vez de ir por carretera.",
  },
  AR: {
    medios: ["Subte (Buenos Aires)", "Colectivo urbano", "Autobús de larga distancia", "Tren urbano"],
    comoSePaga: "Tarjeta SUBE para subte, colectivo y tren urbano; sin ella no se puede pagar el colectivo. Los buses de larga distancia, por web o terminal.",
    aviso: "Los buses de larga distancia tienen categorías (semicama, cama, suite): en trayectos de 10+ horas la diferencia se nota mucho.",
  },
  UY: {
    medios: ["Autobús urbano", "Autobús interdepartamental", "Taxi / app"],
    comoSePaga: "Tarjeta STM en Montevideo; los buses entre ciudades salen de la Tres Cruces y se compran en ventanilla o web.",
  },
  PY: { medios: ["Autobús urbano", "Autobús de larga distancia", "Taxi / app"], comoSePaga: "En efectivo o con tarjeta según la empresa; los buses largos se compran en la terminal." },
  EC: {
    medios: ["Autobús interprovincial", "Trole y Ecovía (Quito)", "Metro de Quito", "Taxi / app"],
    comoSePaga: "En efectivo casi todo, en dólares estadounidenses. Los buses entre ciudades salen de terminales terrestres y son muy baratos.",
    aviso: "Ecuador usa el dólar de EE. UU.: lleva billetes pequeños, los grandes cuesta cambiarlos.",
  },
  BR: {
    medios: ["Metro", "Autobús urbano", "Autobús de larga distancia", "Vuelo interno"],
    comoSePaga: "Tarjeta recargable propia de cada ciudad (Bilhete Único en São Paulo, RioCard en Río). Los buses largos, en rodoviária o web.",
    aviso: "Las distancias son enormes: entre regiones el avión suele salir parecido al bus de 20 horas.",
  },
  MX: {
    medios: ["Metro y Metrobús (CDMX)", "Autobús foráneo (ADO y otras)", "Colectivo / pesero", "Taxi / app"],
    comoSePaga: "Tarjeta de Movilidad Integrada en CDMX para metro y metrobús. Los autobuses foráneos se compran en terminal o web.",
    apps: "Uber y DiDi en la mayoría de ciudades.",
  },
  PA: { medios: ["Metro (Ciudad de Panamá)", "Metrobús", "Autobús interurbano", "Taxi / app"], comoSePaga: "Tarjeta Rapipass para metro y metrobús; no se paga en efectivo a bordo." },
  GT: { medios: ["Camioneta (bus de ruta)", "Shuttle turístico", "Taxi / app"], comoSePaga: "En efectivo en las camionetas; los shuttles entre destinos turísticos se reservan en agencias y son puerta a puerta." },
  US: { medios: ["Metro y tren urbano", "Autobús", "Taxi / app", "Coche de alquiler"], comoSePaga: "Tarjeta recargable propia de cada ciudad. Fuera de las grandes ciudades el transporte público es escaso: casi siempre hace falta coche." },
  FR: { medios: ["Metro", "Tranvía", "Autobús", "Tren TER y TGV"], comoSePaga: "Billete o abono urbano por ciudad; los trenes entre ciudades, en SNCF Connect, más baratos cuanto antes se compren." },
  GB: { medios: ["Metro (Tube)", "Autobús", "Tren nacional"], comoSePaga: "En Londres se paga con tarjeta bancaria sin contacto u Oyster, con tope diario automático." },
  NL: { medios: ["Tranvía", "Metro", "Autobús", "Tren NS", "Bici"], comoSePaga: "Tarjeta OV-chipkaart o tarjeta bancaria sin contacto; hay que fichar al entrar y al salir, también en el tren." },
};

// El orden importa poco, pero agrupar por región ayuda a mantenerlo.
// Todos los países del mundo, para que reconocer una ciudad sirva de algo:
// si el diccionario resuelve "Uagadugú" pero el país no está en esta lista,
// la app se queda igual de vacía que antes.
//
// Regla de honestidad: `emergencias` solo se rellena cuando hay certeza.
// Un número de emergencias equivocado es peor que no dar ninguno, así que
// donde no la hay el campo se omite y la pantalla dice que lo confirmes al
// llegar. Las monedas sí van completas porque un error ahí no es grave.
const LISTA: Pais[] = [
  // ── América del Sur ──────────────────────────────────────────────────
  { codigo: "CO", nombre: "Colombia", moneda: "peso colombiano (COP)", emergencias: "123", bloques: ["can", "mercosur"], autoridad: { nombre: "Policía Nacional de Colombia", url: "https://www.policia.gov.co" } },
  { codigo: "EC", nombre: "Ecuador", moneda: "dólar estadounidense (USD)", emergencias: "911", bloques: ["can", "mercosur"] },
  { codigo: "PE", nombre: "Perú", moneda: "sol (PEN)", emergencias: "105 (policía) · 106 (ambulancia)", bloques: ["can", "mercosur"] },
  { codigo: "BO", nombre: "Bolivia", moneda: "boliviano (BOB)", emergencias: "110 (policía) · 118 (ambulancia)", bloques: ["can", "mercosur"] },
  { codigo: "CL", nombre: "Chile", moneda: "peso chileno (CLP)", emergencias: "133 (carabineros) · 131 (ambulancia)", bloques: ["mercosur"] },
  { codigo: "AR", nombre: "Argentina", moneda: "peso argentino (ARS)", emergencias: "911 · 107 (emergencia médica)", bloques: ["mercosur"] },
  { codigo: "UY", nombre: "Uruguay", moneda: "peso uruguayo (UYU)", emergencias: "911", bloques: ["mercosur"] },
  { codigo: "PY", nombre: "Paraguay", moneda: "guaraní (PYG)", emergencias: "911", bloques: ["mercosur"] },
  { codigo: "BR", nombre: "Brasil", alias: ["Brazil"], moneda: "real (BRL)", emergencias: "190 (policía) · 192 (ambulancia) · 193 (bomberos)", bloques: ["mercosur"] },
  { codigo: "VE", nombre: "Venezuela", moneda: "bolívar (VES)", emergencias: "911" },
  { codigo: "GY", nombre: "Guyana", moneda: "dólar guyanés (GYD)" },
  { codigo: "SR", nombre: "Surinam", moneda: "dólar surinamés (SRD)" },

  // ── Centroamérica y Caribe ───────────────────────────────────────────
  { codigo: "PA", nombre: "Panamá", moneda: "balboa y dólar (PAB/USD)", emergencias: "911" },
  { codigo: "CR", nombre: "Costa Rica", moneda: "colón (CRC)", emergencias: "911", autoridad: { nombre: "Instituto Costarricense de Turismo", url: "https://www.ict.go.cr" } },
  { codigo: "NI", nombre: "Nicaragua", moneda: "córdoba (NIO)", emergencias: "118 (policía)", bloques: ["ca4"] },
  { codigo: "HN", nombre: "Honduras", moneda: "lempira (HNL)", emergencias: "911", bloques: ["ca4"] },
  { codigo: "SV", nombre: "El Salvador", moneda: "dólar estadounidense (USD)", emergencias: "911", bloques: ["ca4"] },
  { codigo: "GT", nombre: "Guatemala", moneda: "quetzal (GTQ)", emergencias: "110 (policía) · 122 (bomberos)", bloques: ["ca4"] },
  { codigo: "BZ", nombre: "Belice", moneda: "dólar beliceño (BZD)", emergencias: "911" },
  { codigo: "MX", nombre: "México", alias: ["Mexico"], moneda: "peso mexicano (MXN)", emergencias: "911" },
  { codigo: "CU", nombre: "Cuba", moneda: "peso cubano (CUP)", emergencias: "106 (policía) · 104 (ambulancia)" },
  { codigo: "DO", nombre: "República Dominicana", moneda: "peso dominicano (DOP)", emergencias: "911" },
  { codigo: "PR", nombre: "Puerto Rico", moneda: "dólar estadounidense (USD)", emergencias: "911" },
  { codigo: "HT", nombre: "Haití", moneda: "gourde (HTG)" },
  { codigo: "JM", nombre: "Jamaica", moneda: "dólar jamaicano (JMD)", emergencias: "119 (policía) · 110 (ambulancia)" },
  { codigo: "TT", nombre: "Trinidad y Tobago", moneda: "dólar trinitense (TTD)", emergencias: "999 (policía) · 811 (ambulancia)" },
  { codigo: "BB", nombre: "Barbados", moneda: "dólar de Barbados (BBD)" },
  { codigo: "BS", nombre: "Bahamas", moneda: "dólar bahameño (BSD)", emergencias: "911" },
  { codigo: "AG", nombre: "Antigua y Barbuda", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "DM", nombre: "Dominica", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "GD", nombre: "Granada", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "KN", nombre: "San Cristóbal y Nieves", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "LC", nombre: "Santa Lucía", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "VC", nombre: "San Vicente y las Granadinas", moneda: "dólar del Caribe Oriental (XCD)" },
  { codigo: "AW", nombre: "Aruba", moneda: "florín arubeño (AWG)" },
  { codigo: "CW", nombre: "Curazao", moneda: "florín antillano (ANG)" },

  // ── Norteamérica ─────────────────────────────────────────────────────
  { codigo: "US", nombre: "Estados Unidos", alias: ["EEUU", "EE. UU.", "USA", "United States"], moneda: "dólar estadounidense (USD)", emergencias: "911" },
  { codigo: "CA", nombre: "Canadá", moneda: "dólar canadiense (CAD)", emergencias: "911" },

  // ── Europa ───────────────────────────────────────────────────────────
  { codigo: "ES", nombre: "España", moneda: "euro (EUR)", emergencias: "112 · 091 (policía nacional)", bloques: ["schengen", "ue"], autoridad: { nombre: "Policía Nacional", url: "https://www.policia.es" } },
  { codigo: "PT", nombre: "Portugal", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"], autoridad: { nombre: "PSP — Polícia de Segurança Pública", url: "https://www.psp.pt" } },
  { codigo: "FR", nombre: "Francia", moneda: "euro (EUR)", emergencias: "112 · 15 (SAMU)", bloques: ["schengen", "ue"] },
  { codigo: "IT", nombre: "Italia", moneda: "euro (EUR)", emergencias: "112 · 113 (policía)", bloques: ["schengen", "ue"], autoridad: { nombre: "Polizia di Stato", url: "https://www.poliziadistato.it" } },
  { codigo: "DE", nombre: "Alemania", moneda: "euro (EUR)", emergencias: "112 · 110 (policía)", bloques: ["schengen", "ue"], autoridad: { nombre: "Policía de Alemania", url: "https://www.polizei.de" } },
  { codigo: "AT", nombre: "Austria", moneda: "euro (EUR)", emergencias: "112 · 133 (policía)", bloques: ["schengen", "ue"], autoridad: { nombre: "Policía de Austria", url: "https://www.polizei.gv.at" } },
  { codigo: "CH", nombre: "Suiza", moneda: "franco suizo (CHF)", emergencias: "112 · 117 (policía)", bloques: ["schengen"] },
  { codigo: "SI", nombre: "Eslovenia", moneda: "euro (EUR)", emergencias: "112 · 113 (policía)", bloques: ["schengen", "ue"], autoridad: { nombre: "Policía de Eslovenia", url: "https://www.policija.si" } },
  { codigo: "GR", nombre: "Grecia", moneda: "euro (EUR)", emergencias: "112 · 100 (policía)", bloques: ["schengen", "ue"], autoridad: { nombre: "Policía Helénica", url: "https://www.astynomia.gr" } },
  { codigo: "NL", nombre: "Países Bajos", alias: ["Holanda"], moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "BE", nombre: "Bélgica", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "LU", nombre: "Luxemburgo", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "IE", nombre: "Irlanda", moneda: "euro (EUR)", emergencias: "112 · 999", bloques: ["ue"] },
  { codigo: "GB", nombre: "Reino Unido", alias: ["Inglaterra", "UK", "Gran Bretaña"], moneda: "libra esterlina (GBP)", emergencias: "999 · 112" },
  { codigo: "PL", nombre: "Polonia", moneda: "esloti (PLN)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "CZ", nombre: "República Checa", alias: ["Chequia"], moneda: "corona checa (CZK)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "SK", nombre: "Eslovaquia", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "HU", nombre: "Hungría", moneda: "forinto (HUF)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "HR", nombre: "Croacia", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "RO", nombre: "Rumanía", moneda: "leu (RON)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "BG", nombre: "Bulgaria", moneda: "lev (BGN)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "SE", nombre: "Suecia", moneda: "corona sueca (SEK)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "NO", nombre: "Noruega", moneda: "corona noruega (NOK)", emergencias: "112 · 113 (ambulancia)", bloques: ["schengen"] },
  { codigo: "DK", nombre: "Dinamarca", moneda: "corona danesa (DKK)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "FI", nombre: "Finlandia", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "IS", nombre: "Islandia", moneda: "corona islandesa (ISK)", emergencias: "112", bloques: ["schengen"] },
  { codigo: "EE", nombre: "Estonia", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "LV", nombre: "Letonia", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "LT", nombre: "Lituania", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "MT", nombre: "Malta", moneda: "euro (EUR)", emergencias: "112", bloques: ["schengen", "ue"] },
  { codigo: "CY", nombre: "Chipre", moneda: "euro (EUR)", emergencias: "112", bloques: ["ue"] },
  { codigo: "RS", nombre: "Serbia", moneda: "dinar serbio (RSD)", emergencias: "112 · 192 (policía)" },
  { codigo: "BA", nombre: "Bosnia y Herzegovina", moneda: "marco convertible (BAM)", emergencias: "112 · 122 (policía)" },
  { codigo: "ME", nombre: "Montenegro", moneda: "euro (EUR)", emergencias: "112" },
  { codigo: "MK", nombre: "Macedonia del Norte", moneda: "denar (MKD)", emergencias: "112" },
  { codigo: "AL", nombre: "Albania", moneda: "lek (ALL)", emergencias: "112" },
  { codigo: "XK", nombre: "Kosovo", moneda: "euro (EUR)", emergencias: "112" },
  { codigo: "MD", nombre: "Moldavia", moneda: "leu moldavo (MDL)", emergencias: "112" },
  { codigo: "UA", nombre: "Ucrania", moneda: "grivna (UAH)", emergencias: "112" },
  { codigo: "BY", nombre: "Bielorrusia", moneda: "rublo bielorruso (BYN)", emergencias: "112 · 102 (policía)" },
  { codigo: "RU", nombre: "Rusia", moneda: "rublo (RUB)", emergencias: "112" },
  { codigo: "TR", nombre: "Turquía", moneda: "lira turca (TRY)", emergencias: "112" },
  { codigo: "AD", nombre: "Andorra", moneda: "euro (EUR)", emergencias: "112" },
  { codigo: "MC", nombre: "Mónaco", moneda: "euro (EUR)", emergencias: "112" },
  { codigo: "SM", nombre: "San Marino", moneda: "euro (EUR)", emergencias: "112" },
  { codigo: "LI", nombre: "Liechtenstein", moneda: "franco suizo (CHF)", emergencias: "112", bloques: ["schengen"] },
  { codigo: "VA", nombre: "Ciudad del Vaticano", alias: ["Vaticano"], moneda: "euro (EUR)" },

  // ── Asia ─────────────────────────────────────────────────────────────
  { codigo: "JP", nombre: "Japón", moneda: "yen (JPY)", emergencias: "110 (policía) · 119 (ambulancia y bomberos)", telefonoTurista: "050-3816-2787 (línea de ayuda al visitante, 24 h)", autoridad: { nombre: "Organización Nacional de Turismo de Japón", url: "https://www.jnto.go.jp" } },
  { codigo: "KR", nombre: "Corea del Sur", moneda: "won (KRW)", emergencias: "112 (policía) · 119 (ambulancia)" },
  { codigo: "KP", nombre: "Corea del Norte" },
  { codigo: "CN", nombre: "China", moneda: "yuan (CNY)", emergencias: "110 (policía) · 120 (ambulancia)" },
  { codigo: "TW", nombre: "Taiwán", moneda: "nuevo dólar taiwanés (TWD)", emergencias: "110 (policía) · 119 (ambulancia)" },
  { codigo: "HK", nombre: "Hong Kong", moneda: "dólar de Hong Kong (HKD)", emergencias: "999" },
  { codigo: "MO", nombre: "Macao", moneda: "pataca (MOP)", emergencias: "999" },
  { codigo: "MN", nombre: "Mongolia", moneda: "tugrik (MNT)" },
  { codigo: "TH", nombre: "Tailandia", moneda: "baht (THB)", emergencias: "191 (policía) · 1669 (ambulancia)", telefonoTurista: "1155 (policía turística, atiende en inglés)", autoridad: { nombre: "Autoridad de Turismo de Tailandia", url: "https://www.tourismthailand.org" } },
  { codigo: "VN", nombre: "Vietnam", moneda: "dong (VND)", emergencias: "113 (policía) · 115 (ambulancia)" },
  { codigo: "KH", nombre: "Camboya", moneda: "riel (KHR)", emergencias: "117 (policía) · 119 (ambulancia)" },
  { codigo: "LA", nombre: "Laos", moneda: "kip (LAK)" },
  { codigo: "MM", nombre: "Birmania", alias: ["Myanmar"], moneda: "kyat (MMK)" },
  { codigo: "MY", nombre: "Malasia", moneda: "ringgit (MYR)", emergencias: "999" },
  { codigo: "SG", nombre: "Singapur", moneda: "dólar de Singapur (SGD)", emergencias: "999 (policía) · 995 (ambulancia)" },
  { codigo: "ID", nombre: "Indonesia", moneda: "rupia (IDR)", emergencias: "112" },
  { codigo: "PH", nombre: "Filipinas", moneda: "peso filipino (PHP)", emergencias: "911" },
  { codigo: "BN", nombre: "Brunéi", moneda: "dólar de Brunéi (BND)", emergencias: "993 (policía) · 991 (ambulancia)" },
  { codigo: "TL", nombre: "Timor Oriental", moneda: "dólar estadounidense (USD)" },
  { codigo: "IN", nombre: "India", moneda: "rupia india (INR)", emergencias: "112" },
  { codigo: "PK", nombre: "Pakistán", moneda: "rupia pakistaní (PKR)", emergencias: "15 (policía)" },
  { codigo: "BD", nombre: "Bangladés", moneda: "taka (BDT)", emergencias: "999" },
  { codigo: "LK", nombre: "Sri Lanka", moneda: "rupia de Sri Lanka (LKR)", emergencias: "119" },
  { codigo: "NP", nombre: "Nepal", moneda: "rupia nepalí (NPR)", emergencias: "100 (policía)" },
  { codigo: "BT", nombre: "Bután", moneda: "ngultrum (BTN)", emergencias: "113 (policía)" },
  { codigo: "MV", nombre: "Maldivas", moneda: "rufiyaa (MVR)", emergencias: "119 (policía)" },
  { codigo: "AF", nombre: "Afganistán", moneda: "afgani (AFN)" },
  { codigo: "IR", nombre: "Irán", moneda: "rial iraní (IRR)", emergencias: "110 (policía) · 115 (ambulancia)" },
  { codigo: "IQ", nombre: "Irak", moneda: "dinar iraquí (IQD)" },
  { codigo: "SY", nombre: "Siria", moneda: "libra siria (SYP)" },
  { codigo: "LB", nombre: "Líbano", moneda: "libra libanesa (LBP)", emergencias: "112 (policía) · 140 (Cruz Roja)" },
  { codigo: "JO", nombre: "Jordania", moneda: "dinar jordano (JOD)", emergencias: "911" },
  { codigo: "IL", nombre: "Israel", moneda: "séquel (ILS)", emergencias: "100 (policía) · 101 (ambulancia)" },
  { codigo: "PS", nombre: "Palestina", moneda: "séquel (ILS)" },
  { codigo: "SA", nombre: "Arabia Saudí", moneda: "riyal saudí (SAR)", emergencias: "911" },
  { codigo: "AE", nombre: "Emiratos Árabes Unidos", moneda: "dírham (AED)", emergencias: "999" },
  { codigo: "QA", nombre: "Catar", moneda: "riyal catarí (QAR)", emergencias: "999" },
  { codigo: "KW", nombre: "Kuwait", moneda: "dinar kuwaití (KWD)", emergencias: "112" },
  { codigo: "BH", nombre: "Baréin", moneda: "dinar bahreiní (BHD)", emergencias: "999" },
  { codigo: "OM", nombre: "Omán", moneda: "rial omaní (OMR)", emergencias: "9999" },
  { codigo: "YE", nombre: "Yemen", moneda: "rial yemení (YER)" },
  { codigo: "GE", nombre: "Georgia", moneda: "lari (GEL)", emergencias: "112" },
  { codigo: "AM", nombre: "Armenia", moneda: "dram (AMD)", emergencias: "911" },
  { codigo: "AZ", nombre: "Azerbaiyán", moneda: "manat (AZN)", emergencias: "112" },
  { codigo: "KZ", nombre: "Kazajistán", moneda: "tenge (KZT)", emergencias: "112" },
  { codigo: "UZ", nombre: "Uzbekistán", moneda: "som (UZS)" },
  { codigo: "TM", nombre: "Turkmenistán", moneda: "manat turcomano (TMT)" },
  { codigo: "TJ", nombre: "Tayikistán", moneda: "somoni (TJS)" },
  { codigo: "KG", nombre: "Kirguistán", moneda: "som kirguís (KGS)" },

  // ── África ───────────────────────────────────────────────────────────
  { codigo: "MA", nombre: "Marruecos", moneda: "dírham (MAD)", emergencias: "19 (policía) · 15 (ambulancia) · 177 (gendarmería, carretera)" },
  { codigo: "DZ", nombre: "Argelia", moneda: "dinar argelino (DZD)", emergencias: "17 (policía) · 14 (protección civil)" },
  { codigo: "TN", nombre: "Túnez", moneda: "dinar tunecino (TND)", emergencias: "197 (policía) · 190 (ambulancia)" },
  { codigo: "LY", nombre: "Libia", moneda: "dinar libio (LYD)" },
  { codigo: "EG", nombre: "Egipto", moneda: "libra egipcia (EGP)", emergencias: "122 (policía) · 123 (ambulancia)" },
  { codigo: "SD", nombre: "Sudán", moneda: "libra sudanesa (SDG)" },
  { codigo: "SS", nombre: "Sudán del Sur", moneda: "libra sursudanesa (SSP)" },
  { codigo: "ET", nombre: "Etiopía", moneda: "birr (ETB)" },
  { codigo: "ER", nombre: "Eritrea", moneda: "nakfa (ERN)" },
  { codigo: "DJ", nombre: "Yibuti", moneda: "franco yibutiano (DJF)" },
  { codigo: "SO", nombre: "Somalia", moneda: "chelín somalí (SOS)" },
  { codigo: "KE", nombre: "Kenia", moneda: "chelín keniano (KES)", emergencias: "999 · 112" },
  { codigo: "UG", nombre: "Uganda", moneda: "chelín ugandés (UGX)", emergencias: "999 · 112" },
  { codigo: "RW", nombre: "Ruanda", moneda: "franco ruandés (RWF)", emergencias: "112" },
  { codigo: "BI", nombre: "Burundi", moneda: "franco burundés (BIF)" },
  { codigo: "TZ", nombre: "Tanzania", moneda: "chelín tanzano (TZS)", emergencias: "112" },
  { codigo: "MZ", nombre: "Mozambique", moneda: "metical (MZN)" },
  { codigo: "MW", nombre: "Malaui", moneda: "kwacha malauí (MWK)" },
  { codigo: "ZM", nombre: "Zambia", moneda: "kwacha zambiano (ZMW)", emergencias: "999" },
  { codigo: "ZW", nombre: "Zimbabue", moneda: "dólar zimbabuense (ZWG)", emergencias: "999" },
  { codigo: "BW", nombre: "Botsuana", moneda: "pula (BWP)", emergencias: "999" },
  { codigo: "NA", nombre: "Namibia", moneda: "dólar namibio (NAD)", emergencias: "10111 (policía)" },
  { codigo: "ZA", nombre: "Sudáfrica", moneda: "rand (ZAR)", emergencias: "10111 (policía) · 10177 (ambulancia)" },
  { codigo: "LS", nombre: "Lesoto", moneda: "loti (LSL)" },
  { codigo: "SZ", nombre: "Esuatini", moneda: "lilangeni (SZL)", emergencias: "999" },
  { codigo: "AO", nombre: "Angola", moneda: "kwanza (AOA)", emergencias: "113 (policía)" },
  { codigo: "CD", nombre: "República Democrática del Congo", moneda: "franco congoleño (CDF)" },
  { codigo: "CG", nombre: "República del Congo", moneda: "franco CFA (XAF)" },
  { codigo: "GA", nombre: "Gabón", moneda: "franco CFA (XAF)" },
  { codigo: "GQ", nombre: "Guinea Ecuatorial", moneda: "franco CFA (XAF)" },
  { codigo: "CM", nombre: "Camerún", moneda: "franco CFA (XAF)", emergencias: "117 (policía)" },
  { codigo: "CF", nombre: "República Centroafricana", moneda: "franco CFA (XAF)" },
  { codigo: "TD", nombre: "Chad", moneda: "franco CFA (XAF)" },
  { codigo: "NE", nombre: "Níger", moneda: "franco CFA (XOF)" },
  { codigo: "NG", nombre: "Nigeria", moneda: "naira (NGN)", emergencias: "112" },
  { codigo: "BJ", nombre: "Benín", moneda: "franco CFA (XOF)", emergencias: "117 (policía)" },
  { codigo: "TG", nombre: "Togo", moneda: "franco CFA (XOF)" },
  { codigo: "GH", nombre: "Ghana", moneda: "cedi (GHS)", emergencias: "112 · 191 (policía)" },
  { codigo: "CI", nombre: "Costa de Marfil", moneda: "franco CFA (XOF)" },
  { codigo: "BF", nombre: "Burkina Faso", moneda: "franco CFA (XOF)" },
  { codigo: "ML", nombre: "Malí", moneda: "franco CFA (XOF)" },
  { codigo: "SN", nombre: "Senegal", moneda: "franco CFA (XOF)", emergencias: "17 (policía)" },
  { codigo: "GM", nombre: "Gambia", moneda: "dalasi (GMD)" },
  { codigo: "GW", nombre: "Guinea-Bisáu", moneda: "franco CFA (XOF)" },
  { codigo: "GN", nombre: "Guinea", moneda: "franco guineano (GNF)" },
  { codigo: "SL", nombre: "Sierra Leona", moneda: "leone (SLE)" },
  { codigo: "LR", nombre: "Liberia", moneda: "dólar liberiano (LRD)" },
  { codigo: "MR", nombre: "Mauritania", moneda: "uguiya (MRU)" },
  { codigo: "CV", nombre: "Cabo Verde", moneda: "escudo caboverdiano (CVE)" },
  { codigo: "ST", nombre: "Santo Tomé y Príncipe", moneda: "dobra (STN)" },
  { codigo: "KM", nombre: "Comoras", moneda: "franco comorense (KMF)" },
  { codigo: "MG", nombre: "Madagascar", moneda: "ariary (MGA)" },
  { codigo: "MU", nombre: "Mauricio", moneda: "rupia de Mauricio (MUR)", emergencias: "999 (policía) · 114 (ambulancia)" },
  { codigo: "SC", nombre: "Seychelles", moneda: "rupia de Seychelles (SCR)", emergencias: "999" },

  // ── Oceanía ──────────────────────────────────────────────────────────
  { codigo: "AU", nombre: "Australia", moneda: "dólar australiano (AUD)", emergencias: "000" },
  { codigo: "NZ", nombre: "Nueva Zelanda", moneda: "dólar neozelandés (NZD)", emergencias: "111" },
  { codigo: "FJ", nombre: "Fiyi", moneda: "dólar fiyiano (FJD)", emergencias: "911" },
  { codigo: "PG", nombre: "Papúa Nueva Guinea", moneda: "kina (PGK)" },
  { codigo: "SB", nombre: "Islas Salomón", moneda: "dólar salomonense (SBD)" },
  { codigo: "VU", nombre: "Vanuatu", moneda: "vatu (VUV)" },
  { codigo: "WS", nombre: "Samoa", moneda: "tala (WST)" },
  { codigo: "TO", nombre: "Tonga", moneda: "paanga (TOP)" },
  { codigo: "KI", nombre: "Kiribati", moneda: "dólar australiano (AUD)" },
  { codigo: "FM", nombre: "Micronesia", moneda: "dólar estadounidense (USD)" },
  { codigo: "MH", nombre: "Islas Marshall", moneda: "dólar estadounidense (USD)" },
  { codigo: "NR", nombre: "Nauru", moneda: "dólar australiano (AUD)" },
  { codigo: "TV", nombre: "Tuvalu", moneda: "dólar australiano (AUD)" },
  { codigo: "PW", nombre: "Palaos", moneda: "dólar estadounidense (USD)" },
  { codigo: "PF", nombre: "Polinesia Francesa", moneda: "franco CFP (XPF)" },
  { codigo: "NC", nombre: "Nueva Caledonia", moneda: "franco CFP (XPF)" },
];

export const PAISES: Pais[] = LISTA.map((p) => ({ ...p, transporteLocal: TRANSPORTE[p.codigo] }));

const POR_CODIGO = new Map(PAISES.map((p) => [p.codigo, p]));

export function buscarPaisPorCodigo(codigo?: string): Pais | undefined {
  return codigo ? POR_CODIGO.get(codigo.toUpperCase()) : undefined;
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.]/g, "")
    .trim();
}

const POR_NOMBRE = new Map<string, Pais>();
for (const p of PAISES) {
  POR_NOMBRE.set(normalizar(p.nombre), p);
  for (const alias of p.alias ?? []) POR_NOMBRE.set(normalizar(alias), p);
}

export function buscarPaisPorNombre(nombre: string): Pais | undefined {
  return POR_NOMBRE.get(normalizar(nombre));
}

// Bloques compartidos entre dos países, para explicar qué implica de
// verdad cruzar esa frontera concreta.
export function bloquesComunes(a?: Pais, b?: Pais): BloqueRegional[] {
  if (!a || !b) return [];
  const deB = new Set(b.bloques ?? []);
  return (a.bloques ?? []).filter((x) => deB.has(x));
}
