// Cómo se cuenta un lugar en el Modo Guía: por tema (historia, leyendas,
// arquitectura…) y en el idioma elegido. El texto sale de las secciones
// reales del artículo de Wikipedia; si el artículo no tiene esa sección se
// dice y se cuenta el resumen — nunca se inventa una leyenda.

import type { Articulo } from "./cercaDeMi";

export type IdiomaId = "es" | "en" | "fr" | "de" | "pt" | "it";
export type TemaId = "resumen" | "historia" | "leyendas" | "arquitectura" | "naturaleza" | "curiosidades";

export const IDIOMAS: { id: IdiomaId; nombre: string; voz: string }[] = [
  { id: "en", nombre: "English", voz: "en-US" },
  { id: "es", nombre: "Español", voz: "es-ES" },
  { id: "fr", nombre: "Français", voz: "fr-FR" },
  { id: "de", nombre: "Deutsch", voz: "de-DE" },
  { id: "pt", nombre: "Português", voz: "pt-PT" },
  { id: "it", nombre: "Italiano", voz: "it-IT" },
];

export const TEMAS: { id: TemaId; etiqueta: string; icono: string }[] = [
  { id: "resumen", etiqueta: "Overview", icono: "✨" },
  { id: "historia", etiqueta: "History", icono: "🏛️" },
  { id: "leyendas", etiqueta: "Legends", icono: "🐉" },
  { id: "arquitectura", etiqueta: "Architecture", icono: "🏗️" },
  { id: "naturaleza", etiqueta: "Nature", icono: "🌿" },
  { id: "curiosidades", etiqueta: "Fun facts", icono: "🎭" },
];

const PALABRAS: Record<Exclude<TemaId, "resumen">, Record<IdiomaId, string[]>> = {
  historia: {
    en: ["history", "origins", "etymology", "background", "foundation", "early"],
    es: ["historia", "orígenes", "origen", "etimología", "fundación", "antecedentes"],
    fr: ["histoire", "origines", "étymologie", "fondation"],
    de: ["geschichte", "ursprung", "etymologie", "gründung"],
    pt: ["história", "origens", "etimologia", "fundação"],
    it: ["storia", "origini", "etimologia", "fondazione"],
  },
  leyendas: {
    en: ["legend", "myth", "folklore", "tradition", "superstition", "ghost", "lore"],
    es: ["leyenda", "mito", "folclor", "folklore", "tradici", "supersti"],
    fr: ["légende", "mythe", "folklore", "tradition"],
    de: ["legende", "sage", "mythos", "volksglaube", "brauchtum"],
    pt: ["lenda", "mito", "folclore", "tradiç"],
    it: ["leggend", "mito", "folklore", "tradizion"],
  },
  arquitectura: {
    en: ["architecture", "design", "building", "structure", "description", "layout", "interior", "exterior", "facade"],
    es: ["arquitectura", "diseño", "edificio", "estructura", "descripción", "interior", "exterior", "fachada"],
    fr: ["architecture", "description", "bâtiment", "structure", "intérieur", "façade"],
    de: ["architektur", "beschreibung", "bauwerk", "gebäude", "aufbau", "fassade"],
    pt: ["arquitetura", "arquitectura", "descrição", "edifício", "estrutura", "fachada"],
    it: ["architettura", "descrizione", "edificio", "struttura", "facciata"],
  },
  naturaleza: {
    en: ["geography", "flora", "fauna", "wildlife", "ecology", "climate", "landscape", "environment", "geology"],
    es: ["geografía", "flora", "fauna", "ecología", "clima", "paisaje", "medio ambiente", "geología"],
    fr: ["géographie", "flore", "faune", "écologie", "climat", "paysage", "géologie"],
    de: ["geographie", "flora", "fauna", "ökologie", "klima", "landschaft", "geologie"],
    pt: ["geografia", "flora", "fauna", "ecologia", "clima", "paisagem", "geologia"],
    it: ["geografia", "flora", "fauna", "ecologia", "clima", "paesaggio", "geologia"],
  },
  curiosidades: {
    en: ["trivia", "popular culture", "in fiction", "legacy", "cultural", "culture", "in film", "notable"],
    es: ["curiosidades", "cultura popular", "legado", "en el cine", "cultura"],
    fr: ["anecdote", "culture populaire", "postérité", "héritage", "culture"],
    de: ["trivia", "populärkultur", "rezeption", "kultur", "nachwirkung"],
    pt: ["curiosidades", "cultura popular", "legado", "cultura"],
    it: ["curiosità", "cultura di massa", "cultura popolare", "eredità", "cultura"],
  },
};

const AVISO_SIN_SECCION: Record<IdiomaId, string> = {
  en: "This article has no section on that theme, so here is the overview.",
  es: "El artículo no tiene una sección sobre ese tema, así que aquí va el resumen.",
  fr: "L'article n'a pas de section sur ce thème, voici donc le résumé.",
  de: "Der Artikel hat keinen Abschnitt zu diesem Thema, hier die Zusammenfassung.",
  pt: "O artigo não tem uma seção sobre esse tema, então aqui vai o resumo.",
  it: "L'articolo non ha una sezione su questo tema, ecco quindi il riassunto.",
};

// Frases completas hasta el largo pedido (nunca corta a media frase).
function recortar(texto: string, max: number): string {
  const frases = (texto.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+\s*/g) ?? [texto]).map((f) => f.trim()).filter(Boolean);
  let r = frases[0] ?? texto;
  for (let i = 1; i < frases.length && `${r} ${frases[i]}`.length <= max; i++) r += ` ${frases[i]}`;
  return r;
}

export interface Narracion {
  texto: string;
  usado: TemaId;
  encontrado: boolean;
  aviso?: string;
}

export function narrar(a: Articulo, tema: TemaId, idioma: IdiomaId): Narracion {
  if (tema !== "resumen") {
    const claves = PALABRAS[tema][idioma];
    const seccion = a.secciones.find((s) => s.texto.length >= 80 && claves.some((k) => s.titulo.toLowerCase().includes(k)));
    if (seccion) return { texto: `${a.titulo}. ${recortar(seccion.texto, 520)}`, usado: tema, encontrado: true };
    return { texto: `${a.titulo}. ${recortar(a.intro, 360)}`, usado: "resumen", encontrado: false, aviso: AVISO_SIN_SECCION[idioma] };
  }
  return { texto: `${a.titulo}. ${recortar(a.intro, 360)}`, usado: "resumen", encontrado: true };
}
