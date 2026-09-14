const MESES: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

const DIAS_SEMANA: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
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
