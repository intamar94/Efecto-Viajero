# Efecto Viajero

> «El usuario decide cómo quiere viajar. La plataforma hace que sea fácil.»

Una plataforma que entiende al viajero, el contexto del viaje y las
condiciones reales, y consigue que todo el viaje encaje — no otra agencia
de viajes, comparador o chatbot de itinerarios.

## Estado actual (MVP — B01 + B02)

Este primer recorte demuestra el núcleo descrito en el prompt maestro:

> Usuario → describe el viaje → el sistema lo entiende → selecciona
> viajeros → si no hay destino, propone destinos compatibles; si lo
> hay, continúa → comprueba compatibilidad → construye una primera
> propuesta → detecta requisitos.

Implementado:

- **Pantalla principal** limpia con tres entradas: Planificar un viaje /
  Mis viajes / Viajeros.
- **Viajeros**: personas y mascotas como datos permanentes (documentos,
  nacionalidad, microchip, etc.), reutilizables en cualquier viaje.
- **Planificar un viaje** (puerta única, caso A/B de la sección 6): una
  caja de texto libre traduce la descripción a necesidades estructuradas
  (duración, presupuesto, mascota, intereses, ritmo…). Si el texto ya
  menciona un destino, lo detecta y confirma directamente; si no, calcula
  compatibilidad porcentual contra un dataset de destinos, con
  explicación de cada criterio. El usuario puede **revisar y corregir**
  lo que el sistema entendió (editar días, presupuesto, ritmo, mascota,
  intereses) antes de continuar, y los resultados se recalculan en vivo.
- **Mis viajes**: creación de viaje reutilizando los viajeros guardados
  (sin repetir datos), y un **motor de requisitos** de demostración que
  clasifica cada viajero en 🟢 No detectado / 🟡 Revisar / 🔴 Obligatorio
  por documentación, visado, salud y requisitos de mascota.

Persistencia: `localStorage` en el navegador (capa `src/lib/store.tsx`),
pensada para sustituirse por un backend real sin tocar las pantallas.

El motor de requisitos y el dataset de destinos son **heurísticos y
orientativos** — no sustituyen fuentes oficiales; cada resultado incluye
un aviso en ese sentido, tal como exige el diseño del producto.

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
  app/               rutas (Next.js App Router)
    viajeros/        listar, crear, editar viajeros
    viajes/          listar, crear, ver viaje + requisitos
    planificar/      puerta única: texto libre → necesidades → destino(s)
  components/        UI compartida (cabecera, badge de estado)
  lib/
    types.ts         modelo de datos
    store.tsx         persistencia (localStorage) + contexto React
    destinos.ts       dataset de destinos de demostración
    explorador.ts     parseo NL → necesidades + detección de destino + scoring
    requisitos.ts     motor de requisitos por viajero/destino
    edad.ts, id.ts    utilidades
```

## Próximos bloques

B02 avanzado con LLM real (el parseo actual es heurístico), B03
construcción flexible del viaje (planificar completo / poco a poco /
dejarse llevar), B04 compatibilidad con resolución de conflictos, B05
transporte combinado, B06 alojamiento, B07 actividades + bolsa de
posibilidades, B08 Travel Vault, B09 presupuesto vivo, B10 preparación
offline, B11 Travel Mode, B12 adaptación en tiempo real, B13 exploración
local, B14 souvenirs, B15 modo Resolver, B16 viajes compartidos, B17
memoria del viaje, B18 memoria del viajero, B19 Travel Brain, B20
integraciones — ver el prompt maestro del producto para el detalle de
cada bloque.
