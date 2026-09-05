import { etapasDe } from "./viaje";
import type { Viaje, Itinerario, DiaItinerario, PreferenciaItinerario } from "./types";

export class GeneradorItinerario {
  constructor(
    private viaje: Viaje,
    private actividades: Map<string, { duracionHoras?: number }>
  ) {}

  generarItinerario(prefs: PreferenciaItinerario): Itinerario {
    const dias = this.calcularDias();
    const distribucion = this.distribuirActividades(dias, prefs);
    const horarios = this.asignarHorarios(distribucion, prefs);

    return {
      dias: horarios,
      preferencias: { ...prefs, generada: true, timestamp: new Date().toISOString() },
      generadoEn: new Date().toISOString(),
      version: 1,
    };
  }

  private calcularDias(): DiaItinerario[] {
    if (!this.viaje.fechaSalida || !this.viaje.fechaRegreso) {
      return [];
    }

    const inicio = new Date(this.viaje.fechaSalida);
    const fin = new Date(this.viaje.fechaRegreso);
    const totalDias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
    if (totalDias <= 0) return [];

    // Reparte los días del viaje entre las etapas reales del circuito
    // (Bogotá 3, Medellín 4, Cartagena 4...) en vez de meter todos los días
    // bajo el nombre genérico del viaje. Sin esto, una actividad de
    // Cartagena podía acabar programada en un día en Bogotá.
    const etapas = etapasDe(this.viaje);
    const diasPorEtapa = this.repartirDiasEntreEtapas(etapas, totalDias);

    const dias: DiaItinerario[] = [];
    let contador = 1;
    const fecha = new Date(inicio);
    for (let e = 0; e < etapas.length; e++) {
      for (let d = 0; d < diasPorEtapa[e]; d++) {
        dias.push({
          fecha: fecha.toISOString().split("T")[0],
          dia: contador++,
          etapa: etapas[e].nombre,
          actividades: [],
          descansoTotal: false,
        });
        fecha.setDate(fecha.getDate() + 1);
      }
    }

    return dias;
  }

  private repartirDiasEntreEtapas(etapas: { dias?: number }[], totalDias: number): number[] {
    const declarados = etapas.map((e) => e.dias ?? 0);
    const sumaDeclarados = declarados.reduce((a, b) => a + b, 0);

    // Si las etapas ya traen su propia duración y encaja con el rango de
    // fechas, se respeta tal cual: es la fuente más fiable (viene de Ruta).
    if (sumaDeclarados === totalDias && sumaDeclarados > 0) return declarados;

    // Si no encaja (o falta), se reparte lo mejor posible en proporción a
    // lo declarado, y si no hay nada declarado, a partes iguales.
    const pesos = sumaDeclarados > 0 ? declarados : etapas.map(() => 1);
    const pesoTotal = pesos.reduce((a, b) => a + b, 0);
    const reparto = pesos.map((p) => Math.max(1, Math.round((p / pesoTotal) * totalDias)));

    // El redondeo puede desviar el total: se ajusta en la última etapa.
    const diferencia = totalDias - reparto.reduce((a, b) => a + b, 0);
    reparto[reparto.length - 1] += diferencia;
    return reparto.map((n) => Math.max(1, n));
  }

  private distribuirActividades(
    dias: DiaItinerario[],
    prefs: PreferenciaItinerario
  ): Map<number, string[]> {
    const distribucion = new Map<number, string[]>();
    const etapaPorActividad = new Map(this.viaje.actividades.map((a) => [a.actividadId, a.etapaNombre]));
    const actPlaneadas = this.viaje.actividades
      .filter((a) => a.estado === "planificada" || a.estado === "reservada")
      .map((a) => a.actividadId);

    const horasPorDia = this.calcularHorasDisponibles(prefs, dias.length);

    const actividadesPendientes = new Set(actPlaneadas);

    for (let i = 0; i < dias.length; i++) {
      // Inserta descansos cada 3 días
      if (prefs.permitirDescansos && i > 0 && i % 3 === 0 && dias.length > 3) {
        distribucion.set(i, []);
        dias[i].descansoTotal = true;
        continue;
      }

      const actividadesDia: string[] = [];
      let horasUsadas = 0;

      for (const actId of actividadesPendientes) {
        const act = this.actividades.get(actId);
        if (!act) continue;

        // Una actividad con ciudad asignada solo puede caer en un día de
        // esa misma ciudad: es lo que conecta Actividades con el
        // Itinerario en un circuito de varias paradas.
        const etapaActividad = etapaPorActividad.get(actId);
        if (etapaActividad && etapaActividad !== dias[i].etapa) continue;

        const duracion = act.duracionHoras ?? 1;
        if (horasUsadas + duracion <= horasPorDia[i]) {
          actividadesDia.push(actId);
          actividadesPendientes.delete(actId);
          horasUsadas += duracion;
        }
      }

      distribucion.set(i, actividadesDia);
    }

    return distribucion;
  }

  private calcularHorasDisponibles(prefs: PreferenciaItinerario, numDias: number): number[] {
    const horasBase =
      prefs.ritmo === "tranquilo" ? 5 : prefs.ritmo === "normal" ? 7 : 9;

    return Array.from({ length: numDias }, (_, i) => {
      // Primer y último día parciales
      if (i === 0 || i === numDias - 1) {
        return horasBase * 0.7;
      }
      // Variación natural ±1h
      return horasBase + (Math.random() - 0.5) * 2;
    });
  }

  private asignarHorarios(
    distribucion: Map<number, string[]>,
    prefs: PreferenciaItinerario
  ): DiaItinerario[] {
    const dias = this.calcularDias();
    const horaInicio = prefs.horaLlegada ?? "09:00";

    for (let i = 0; i < dias.length; i++) {
      const actIds = distribucion.get(i) ?? [];

      if (dias[i].descansoTotal) {
        continue;
      }

      let horarioActual = this.parseHora(horaInicio);

      for (const actId of actIds) {
        const act = this.actividades.get(actId);
        if (!act) continue;

        const duracion = act.duracionHoras ?? 1;
        const horaFin = new Date(horarioActual.getTime() + duracion * 3600000);

        dias[i].actividades.push({
          actividadId: actId,
          horaInicio: this.formatoHora(horarioActual),
          horaFin: this.formatoHora(horaFin),
          confirmada: false,
        });

        // 15 minutos entre actividades
        horarioActual = new Date(horaFin.getTime() + 15 * 60000);
      }
    }

    return dias;
  }

  private parseHora(hora: string): Date {
    const [h, m] = hora.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  private formatoHora(date: Date): string {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}
