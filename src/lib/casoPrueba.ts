export const CASO_PRUEBA = {
  text: `Somos tres personas y queremos hacer un viaje cultural a Japón durante 12 días, saliendo de Berlín: dos adultos y una adolescente de 15 años. Queremos visitar Tokio y Kioto, con un ritmo cómodo y sin alquilar coche.

Nos interesa mucho la historia, los barrios tradicionales, los museos, la gastronomía local y algunas experiencias diferentes, pero no queremos llenar todos los días. La adolescente quiere tiempo para explorar zonas modernas y tiendas. Uno de los adultos necesita evitar caminatas demasiado largas y queremos que el sistema tenga en cuenta accesibilidad, descansos y trayectos sencillos.

Queremos comer principalmente comida japonesa y probar platos locales, pero necesitamos muchas opciones vegetarianas y que el sistema indique claramente cuando una recomendación no pueda verificarse. También queremos alternativas bajo techo si llueve y algunas actividades de bajo esfuerzo.

Nuestro presupuesto total es de 4.500 EUR para los tres, incluyendo alojamiento, transporte, comida y actividades. Queremos comparar Tokio y Kioto, decidir cuánto tiempo dedicar a cada ciudad y recibir una propuesta día por día que pueda cambiar si el clima, los horarios o el presupuesto hacen que una opción deje de tener sentido.

Necesitamos conocer los requisitos de entrada que correspondan a nuestra nacionalidad y documentación, transporte entre Tokio y Kioto, moneda, clima, emergencias, mapa, información útil sin conexión y cualquier dato que no pueda verificarse debe quedar explícitamente como pendiente. No queremos que el sistema invente precios, reservas, horarios ni disponibilidad.`,
  fechaSalida: "2027-05-08",
  fechaRegreso: "2027-05-20",
  presupuesto: 4500,
  moneda: "EUR",
  presupuestoTipo: "total" as const,
  presupuestoFlexible: true,
  adultos: 2,
  ninos: 1,
  edadesNinos: [15],
  bebes: 0,
  personasMayores: 0,
  mascotas: 0,
  origen: "Berlín, Alemania",
  interests: ["historia", "cultura", "museos", "barrios tradicionales", "gastronomía", "tiempo libre", "experiencias"],
  food: ["comida japonesa", "vegetariano", "platos locales"],
  transport: ["tren", "transporte público", "sin conducir", "trayectos sencillos"],
  constraints: ["ritmo cómodo", "accesibilidad", "evitar caminatas largas", "descansos", "alternativas bajo techo", "presupuesto total"],
  modoPlanificacion: "completo" as const,
};
