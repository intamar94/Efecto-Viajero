import type { ResearchDomain } from "./researchOrchestrator";

// Memoria de la experiencia reciente, por dominio: cuántas veces seguidas
// ha fallado en esta instancia del servidor. No es una base de datos (para
// eso está persistentMemory.ts, ya preparado para conectarse a Supabase si
// hace falta que sobreviva entre despliegues) — es la forma honesta de
// "aprender de la experiencia" sin fingir que hay un modelo entrenándose
// detrás: un dominio que ha fallado repetidamente se marca como degradado y
// el propio reporte del departamento lo dice, en vez de repetir el mismo
// intento a ciegas cada vez.
interface RegistroFiabilidad {
  fallosSeguidos: number;
  ultimoFalloEn?: string;
  ultimoExitoEn?: string;
}

const UMBRAL_DEGRADADO = 2;

const registro = new Map<ResearchDomain, RegistroFiabilidad>();

export function registrarResultadoDominio(domain: ResearchDomain, exito: boolean) {
  const actual = registro.get(domain) ?? { fallosSeguidos: 0 };
  registro.set(
    domain,
    exito
      ? { fallosSeguidos: 0, ultimoExitoEn: new Date().toISOString(), ultimoFalloEn: actual.ultimoFalloEn }
      : { fallosSeguidos: actual.fallosSeguidos + 1, ultimoFalloEn: new Date().toISOString(), ultimoExitoEn: actual.ultimoExitoEn }
  );
}

export function fiabilidadDominio(domain: ResearchDomain): { fallosSeguidos: number; degradado: boolean } {
  const fallosSeguidos = registro.get(domain)?.fallosSeguidos ?? 0;
  return { fallosSeguidos, degradado: fallosSeguidos >= UMBRAL_DEGRADADO };
}
