export const EJEMPLO_COMPLETO = {
  text: `Somos una familia de varias generaciones y queremos viajar a Colombia durante 14 días, saliendo de Madrid: dos adultos, dos niños de 6 y 11 años, un bebé de 1 año, la abuela de 72 años y nuestro perro Nilo. Queremos visitar Bogotá, Medellín y Cartagena sin que el viaje sea agotador. Necesitamos alojamientos aptos para familias y mascota, habitación tranquila para la abuela y espacio adecuado para el bebé. Preferimos no conducir y queremos priorizar vuelos o transporte cómodo entre ciudades.

Queremos actividades para todos, pero no necesariamente todos juntos todo el tiempo: planes culturales y de historia para los adultos y la abuela, actividades divertidas y seguras para los niños, opciones sencillas para el bebé, paseos tranquilos y lugares donde el perro pueda acompañarnos. También queremos alternativas bajo techo por si llueve, descansos reales entre actividades y días con ritmo tranquilo.

Queremos comer comida colombiana auténtica, pero necesitamos opciones para niños, comidas sencillas para el bebé, restaurantes que puedan aceptar al perro cuando sea posible y alternativas para la abuela. Queremos conocer platos típicos, mercados y experiencias gastronómicas locales.

Necesitamos saber qué documentos necesita cada persona para entrar en Colombia, qué requisitos tiene el bebé, qué debe llevar la abuela, qué seguro de viaje conviene comprobar y qué documentos y certificados necesita Nilo para viajar con nosotros. Queremos conservar pasaportes, documentos de los niños, certificado de nacimiento del bebé, documentación de la abuela, seguro de viaje y documentación veterinaria del perro dentro del viaje.

También queremos controlar un presupuesto familiar total de 6.000 EUR, incluyendo transporte, alojamiento, comida, actividades y gastos previstos. Queremos una ruta completa día por día, clima, moneda, transporte, emergencias, requisitos, lugares para comer, actividades familiares, actividades para diferentes miembros del grupo, descansos, mapa y un paquete de información útil sin conexión. Si una información no puede verificarse, debe quedar marcada como pendiente y no inventarse.`,
  fechaSalida: "2027-04-10",
  fechaRegreso: "2027-04-24",
  presupuesto: 6000,
  moneda: "EUR",
  presupuestoTipo: "total" as const,
  presupuestoFlexible: true,
  adultos: 2,
  ninos: 2,
  edadesNinos: [6, 11],
  bebes: 1,
  personasMayores: 1,
  mascotas: 1,
  origen: "Madrid, España",
  interests: ["historia", "cultura", "naturaleza", "familia", "actividades para niños", "descanso"],
  food: ["comida colombiana", "platos típicos", "mercados", "opciones para niños", "opciones para bebé", "opciones aptas para mascota"],
  transport: ["avión", "transporte cómodo", "sin conducir"],
  constraints: ["ritmo tranquilo", "sin conducir", "descansos", "apto para mascota", "apto para bebé", "apto para persona mayor", "alternativas bajo techo"],
  modoPlanificacion: "completo" as const,
};

export const VIAJEROS_EJEMPLO_COMPLETO = [
  { id: "demo-adulto-1", nombre: "Ana", apellido: "García", tipo: "persona" as const, fechaNacimiento: "1988-05-12", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-a1", tipo: "pasaporte" as const, nombre: "PASAPORTE_ADULTO_1", fechaVencimiento: "2031-05-12" }] },
  { id: "demo-adulto-2", nombre: "Carlos", apellido: "López", tipo: "persona" as const, fechaNacimiento: "1987-09-20", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-a2", tipo: "pasaporte" as const, nombre: "PASAPORTE_ADULTO_2", fechaVencimiento: "2032-09-20" }] },
  { id: "demo-nino-1", nombre: "Leo", apellido: "López García", tipo: "persona" as const, fechaNacimiento: "2020-06-18", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-n1", tipo: "pasaporte" as const, nombre: "PASAPORTE_NINO_6", fechaVencimiento: "2030-06-18" }, { id: "demo-doc-n1b", tipo: "certificado" as const, nombre: "CERTIFICADO_NACIMIENTO_NINO" }] },
  { id: "demo-nino-2", nombre: "Sofía", apellido: "López García", tipo: "persona" as const, fechaNacimiento: "2015-11-03", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-n2", tipo: "pasaporte" as const, nombre: "PASAPORTE_NINO_11", fechaVencimiento: "2030-11-03" }, { id: "demo-doc-n2b", tipo: "certificado" as const, nombre: "CERTIFICADO_NACIMIENTO_NINO_11" }] },
  { id: "demo-bebe", nombre: "Emma", apellido: "López García", tipo: "persona" as const, fechaNacimiento: "2026-01-15", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-b1", tipo: "pasaporte" as const, nombre: "PASAPORTE_BEBE", fechaVencimiento: "2031-01-15" }, { id: "demo-doc-b2", tipo: "certificado" as const, nombre: "CERTIFICADO_NACIMIENTO_BEBE" }] },
  { id: "demo-abuela", nombre: "María", apellido: "García", tipo: "persona" as const, fechaNacimiento: "1954-02-08", nacionalidad: "ES", residencia: "Madrid", documentos: [{ id: "demo-doc-ab1", tipo: "pasaporte" as const, nombre: "PASAPORTE_ABUELA", fechaVencimiento: "2030-02-08" }, { id: "demo-doc-ab2", tipo: "certificado" as const, nombre: "SEGURO_MEDICO_ABUELA" }] },
  { id: "demo-perro", nombre: "Nilo", tipo: "mascota" as const, especie: "perro", raza: "mestizo", fechaNacimiento: "2021-04-01", pesoKg: 18, microchip: "MICROCHIP_NILO", documentos: [{ id: "demo-doc-p1", tipo: "microchip" as const, nombre: "MICROCHIP_NILO" }, { id: "demo-doc-p2", tipo: "certificado" as const, nombre: "CERTIFICADO_VETERINARIO_NILO" }, { id: "demo-doc-p3", tipo: "vacuna" as const, nombre: "VACUNA_RABIA_NILO" }] },
];
