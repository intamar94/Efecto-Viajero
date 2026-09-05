const MESES: Record<number, string> = {
  1: "ene",
  2: "feb",
  3: "mar",
  4: "abr",
  5: "may",
  6: "jun",
  7: "jul",
  8: "ago",
  9: "sep",
  10: "oct",
  11: "nov",
  12: "dic",
};

const DIAS_SEMANA: Record<number, string> = {
  0: "dom",
  1: "lun",
  2: "mar",
  3: "mié",
  4: "jue",
  5: "vie",
  6: "sáb",
};

export function formatearFecha(fecha: string): string {
  const date = new Date(fecha + "T00:00:00");
  const dia = date.getDate();
  const mes = date.getMonth() + 1;
  const diaSemana = DIAS_SEMANA[date.getDay()];
  return `${diaSemana} ${dia} ${MESES[mes]}`;
}

export function formatearRangoFechas(inicio: string, fin: string): string {
  const dateInicio = new Date(inicio + "T00:00:00");
  const dateFin = new Date(fin + "T00:00:00");

  const diaInicio = dateInicio.getDate();
  const mesInicio = dateInicio.getMonth() + 1;
  const mesFinNum = dateFin.getMonth() + 1;
  const diaFin = dateFin.getDate();

  const diaSemanInicio = DIAS_SEMANA[dateInicio.getDay()];
  const diaSemanFin = DIAS_SEMANA[dateFin.getDay()];

  // Si es el mismo mes
  if (mesInicio === mesFinNum) {
    return `${diaSemanInicio} ${diaInicio} - ${diaSemanFin} ${diaFin} ${MESES[mesInicio]}`;
  }

  // Si es diferente mes
  return `${diaSemanInicio} ${diaInicio} ${MESES[mesInicio]} - ${diaSemanFin} ${diaFin} ${MESES[mesFinNum]}`;
}
