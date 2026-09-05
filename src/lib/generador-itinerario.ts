import type { Viaje, Itinerario, DiaItinerario, PreferenciaItinerario, ActividadDestino } from "./types";

export class GeneradorItinerario {
  constructor(
    private viaje: Viaje,
    private actividades: Map<string, ActividadDestino>
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
    const dias: DiaItinerario[] = [];

    let contador = 1;
    for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
      const fechaStr = fecha.toISOString().split("T")[0];
      const etapa = this.viaje.destino;

      dias.push({
        fecha: fechaStr,
        dia: contador++,
        etapa,
        actividades: [],
        descansoTotal: false,
      });
    }

    return dias;
  }

  private distribuirActividades(
    dias: DiaItinerario[],
    prefs: PreferenciaItinerario
  ): Map<number, string[]> {
    const distribucion = new Map<number, string[]>();
    const actPlaneadas = this.viaje.actividades
      .filter((a) => a.estado === "planificada" || a.estado === "reservada")
      .map((a) => a.actividadId);

    const horasPorDia = this.calcularHorasDisponibles(prefs, dias.length);

    let actividadesPendientes = new Set(actPlaneadas);

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
