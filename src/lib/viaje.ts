import { buscarDestinoPorId, buscarDestinoPorNombre } from "./destinos";
import { buscarPaisPorCodigo, bloquesComunes, type BloqueRegional, type Pais } from "./paises";
import type { Destino, Etapa, Viaje } from "./types";

// Puente entre el viaje guardado y lo que necesitan las pantallas.
//
// Un viaje a un solo sitio se trata como un circuito de una sola etapa:
// así no hay dos caminos distintos que mantener. Los viajes creados antes
// de que existieran las etapas no se migran: se les sintetiza la etapa a
// partir del destino que ya tenían.
export function etapasDe(viaje: Viaje): Etapa[] {
  if (viaje.etapas && viaje.etapas.length > 0) return viaje.etapas;
  return [
    {
      id: "principal",
      nombre: viaje.destino,
      paisCodigo: viaje.paisCodigo ?? buscarDestinoPorNombre(viaje.destino)?.paisCodigo,
      destinoId: viaje.destinoId,
      dias: viaje.contexto.duracionDias,
    },
  ];
}

export function esCircuito(viaje: Viaje): boolean {
  return viaje.tipo === "circuito" || etapasDe(viaje).length > 1;
}

export function destinoDeEtapa(etapa: Etapa): Destino | undefined {
  return buscarDestinoPorId(etapa.destinoId) ?? buscarDestinoPorNombre(etapa.nombre);
}

export function paisDeEtapa(etapa: Etapa): Pais | undefined {
  return buscarPaisPorCodigo(etapa.paisCodigo ?? destinoDeEtapa(etapa)?.paisCodigo);
}

// El destino "principal" para las pantallas que solo saben mirar uno.
export function destinoPrincipal(viaje: Viaje): Destino | undefined {
  const etapas = etapasDe(viaje);
  for (const etapa of etapas) {
    const d = destinoDeEtapa(etapa);
    if (d) return d;
  }
  return undefined;
}

export function paisPrincipal(viaje: Viaje): Pais | undefined {
  for (const etapa of etapasDe(viaje)) {
    const p = paisDeEtapa(etapa);
    if (p) return p;
  }
  return undefined;
}

export function paisesDelViaje(viaje: Viaje): Pais[] {
  const vistos = new Set<string>();
  const paises: Pais[] = [];
  for (const etapa of etapasDe(viaje)) {
    const p = paisDeEtapa(etapa);
    if (p && !vistos.has(p.codigo)) {
      vistos.add(p.codigo);
      paises.push(p);
    }
  }
  return paises;
}

export interface Cruce {
  desde: Etapa;
  hacia: Etapa;
  paisDesde?: Pais;
  paisHacia?: Pais;
  mismoPais: boolean;
  bloques: BloqueRegional[];
  cambiaMoneda: boolean;
}

// Lo que pasa entre dos paradas consecutivas: si se cruza frontera, qué
// implica ese cruce concreto y si cambia la moneda. Es la información que
// antes había que ir a buscar a foros, una frontera cada vez.
export function crucesDe(viaje: Viaje): Cruce[] {
  const etapas = etapasDe(viaje);
  const cruces: Cruce[] = [];
  for (let i = 0; i < etapas.length - 1; i++) {
    const desde = etapas[i];
    const hacia = etapas[i + 1];
    const paisDesde = paisDeEtapa(desde);
    const paisHacia = paisDeEtapa(hacia);
    const mismoPais = !!paisDesde && !!paisHacia && paisDesde.codigo === paisHacia.codigo;
    cruces.push({
      desde,
      hacia,
      paisDesde,
      paisHacia,
      mismoPais,
      bloques: mismoPais ? [] : bloquesComunes(paisDesde, paisHacia),
      // Solo se afirma que cambia la moneda cuando se conocen las dos:
      // con una sola no se puede saber, y decirlo sería inventar.
      cambiaMoneda: !!paisDesde?.moneda && !!paisHacia?.moneda && paisDesde.moneda !== paisHacia.moneda,
    });
  }
  return cruces;
}
