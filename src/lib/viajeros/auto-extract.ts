import type { MascotaViajero, PersonaViajero, Viajero } from "@/lib/types";
import { generarId } from "@/lib/id";

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

function numberBefore(text: string, index: number): number {
  const m = text.slice(Math.max(0, index - 20), index).match(/(?:^|\s)(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*$/i);
  if (!m) return 1;
  return /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBERS[m[1].toLowerCase()] ?? 1;
}

function count(text: string, patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return numberBefore(text, match.index);
  }
  return 0;
}

export function extractViajeroComposition(text: string): { adultos: number; ninos: number; bebes: number; personasMayores: number; mascotas: number } {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return {
    adultos: count(normalized, [/adultos?/, /personas?\s+adultas?/]),
    ninos: count(normalized, [/ninos?/, /menores?/]),
    bebes: count(normalized, [/bebes?/]),
    personasMayores: count(normalized, [/personas?\s+mayores?/, /ancianos?/]),
    mascotas: count(normalized, [/gatos?/, /perros?/, /mascotas?/]),
  };
}

export function autoExtractViajeros(text: string): Viajero[] {
  const composition = extractViajeroComposition(text);
  const viajeros: Viajero[] = [];
  const addPeople = (n: number, label: string) => {
    for (let i = 0; i < n; i++) {
      const persona: PersonaViajero = {
        id: generarId(), tipo: "persona", nombre: `${label} ${i + 1}`, documentos: [], createdAt: new Date().toISOString(),
      };
      viajeros.push(persona);
    }
  };
  addPeople(composition.adultos, "Adulto");
  addPeople(composition.ninos, "Niño");
  addPeople(composition.bebes, "Bebé");
  addPeople(composition.personasMayores, "Persona mayor");
  for (let i = 0; i < composition.mascotas; i++) {
    const mascota: MascotaViajero = { id: generarId(), tipo: "mascota", nombre: `Mascota ${i + 1}`, documentos: [], createdAt: new Date().toISOString() };
    viajeros.push(mascota);
  }
  return viajeros;
}

export const extraerViajeros = autoExtractViajeros;
