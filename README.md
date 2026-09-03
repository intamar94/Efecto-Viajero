# Efecto Viajero

> «El usuario decide cómo quiere viajar. La plataforma hace que sea fácil.»

Una plataforma que entiende al viajero, el contexto del viaje y las
condiciones reales, y consigue que todo el viaje encaje — no otra agencia
de viajes, comparador o chatbot de itinerarios.

## Estado actual (B01–B19)

Todos los bloques del roadmap están implementados a nivel funcional,
dentro de las limitaciones honestas de este entorno: **no hay backend,
IA conectada a la app, ni contratos con aerolíneas/hoteles/fuentes
oficiales**. Donde el bloque original pide eso (extracción automática de
PDFs, integraciones reales, sincronizar el mismo viaje entre varios
móviles), se ha construido el patrón de interacción con datos de
demostración claramente señalados como tales — nunca presentados como
reales. **B20 (integraciones reales)** queda explícitamente sin
construir por depender de esos contratos externos.

- **B01 Viajeros + entrada** — pantalla principal, ficha de personas y
  mascotas con documentos, creación básica de viaje.
- **B02 Comprensión del viaje** — `/planificar`: texto libre →
  necesidades estructuradas, detección de destino explícito o
  compatibilidad con destinos, sin fricción de edición.
- **B03 Construcción flexible** — elegir cómo organizar el viaje
  (completo / poco a poco / dejarse llevar) en el hub del viaje.
- **B04 Compatibilidad** — si el presupuesto se excede, la app sugiere
  un ajuste concreto ("Cambiar a alojamiento más barato", "Quitar la
  actividad más cara") con "Ajustar automáticamente" o "Decidir yo".
- **B05 Transporte** — tramos combinables (avión/tren/bus/coche…) con
  coste y hora.
- **B06 Alojamiento** — 3 opciones por destino con pros/contras y
  comparación de precio.
- **B07 Actividades** — bolsa de posibilidades con estados disponible →
  planificada → reservada → realizada.
- **B08 Travel Vault** — reservas a mano, o **importadas de verdad**:
  sube el PDF descargado (se lee en el navegador con `pdfjs-dist`, sin
  servidor) o pega el texto del email, y se extraen tipo/proveedor/
  localizador/fecha/hora/dirección con heurísticas (no IA) para revisar
  antes de guardar.
- **B09 Presupuesto** — planificado vs. disponible, en vivo, agregando
  transporte + alojamiento + actividades.
- **B11+B12+B13 Travel Mode** — "ahora" según fecha real, "tengo X horas
  libres", y adaptación (lluvia / cansancio / transporte perdido) sobre
  el catálogo de actividades.
- **B14 Souvenirs** — catálogo por destino + lista de regalos.
- **B15 Modo Resolver** — pasos de referencia para problemas comunes
  (pasaporte perdido, vuelo cancelado, etc.).
- **B16 Viajes compartidos** — participantes y votaciones **en este
  dispositivo**; sincronizar entre varios móviles necesita cuenta y
  backend reales, señalado explícitamente en la pantalla.
- **B17 Travel Memory** — línea de tiempo de momentos del viaje.
- **B18 Memoria del viajero** — historial de viajes anteriores en la
  ficha del viajero (solo lectura; el viaje actual siempre manda).
- **B19 Travel Brain** — no es una pantalla más: agrega requisitos +
  presupuesto + transporte + alojamiento + actividades en un resumen de
  2-5 conclusiones accionables al principio del hub del viaje.
- **B10 Preparación offline** — no construido (necesita una estrategia
  de caché/PWA que no forma parte de este recorte).
- **B20 Integraciones (recorte real)** — en Transporte y Alojamiento hay
  botones que llevan a Google Flights / Booking.com / Trainline /
  FlixBus con destino y fechas ya escritos, para completar la reserva de
  verdad en la web del proveedor. Ganar comisión de esos enlaces
  requiere darse de alta en un programa de afiliados real (Booking.com
  Partner Program, o un agregador como TravelPayouts) — alta, KYC y
  datos bancarios que no se pueden hacer desde una sesión de código; el
  ID de afiliado se rellena en `src/lib/afiliados.ts` cuando se tenga.

Persistencia: `localStorage` en el navegador (capa `src/lib/store.tsx`),
pensada para sustituirse por un backend real sin tocar las pantallas.

El motor de requisitos y los catálogos (destinos, alojamiento,
actividades, souvenirs) son **heurísticos y orientativos** — no
sustituyen fuentes oficiales ni proveedores reales; cada resultado deja
claro que es una estimación.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

```bash
npm run lint
npm run build
```

## Estructura

```
src/
  app/
    viajeros/                listar, crear, editar viajeros (+ historial B18)
    planificar/               puerta única B02: texto libre → necesidades → destino(s)
    viajes/
      nuevo/                  crear viaje (viajeros preseleccionados)
      [id]/                   hub: resumen (B19), B03, presupuesto (B09), requisitos
        transporte/           B05
        alojamiento/          B06
        actividades/          B07 (bolsa de posibilidades)
        vault/                B08 (Travel Vault)
        modo/                 B11+B12+B13 (Travel Mode)
        resolver/             B15 (Modo Resolver)
        souvenirs/            B14
        compartido/           B16 (participantes + votaciones locales)
        recuerdos/            B17 (Travel Memory)
  components/                 UI compartida (cabecera, badge de estado)
  lib/
    types.ts                  modelo de datos
    store.tsx                 persistencia (localStorage) + contexto React
    destinos.ts                dataset de destinos de demostración
    catalogo.ts                alojamiento/actividades/souvenirs generados por destino
    explorador.ts              parseo NL → necesidades + detección de destino + scoring
    requisitos.ts               motor de requisitos por viajero/destino
    compatibilidad.ts           B04+B09: presupuesto y sugerencia de ajuste
    travelBrain.ts              B19: agrega todo en un resumen accionable
    afiliados.ts                 B20: enlaces de salida a buscadores reales
    extraerDocumento.ts          B08: lectura de PDF (pdfjs-dist) + heurística de campos
    edad.ts, fecha.ts, id.ts    utilidades
public/pdf.worker.min.mjs       worker de pdfjs-dist, servido como estático
```

## Pendiente

- **B10** preparación offline (requiere estrategia PWA/caché).
- **B20** integración de pago/reserva dentro de la app y comisión de
  afiliado real (falta darse de alta en un programa de afiliados).
- Sustituir el parseo heurístico de `/planificar` y de la extracción de
  documentos por un LLM real.
- Sincronización real entre dispositivos para viajes compartidos
  (cuenta + backend).
