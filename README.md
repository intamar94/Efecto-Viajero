# Efecto Viajero

> «El usuario decide cómo quiere viajar. La plataforma hace que sea fácil.»

Una plataforma que entiende al viajero, el contexto del viaje y las
condiciones reales, y consigue que todo el viaje encaje — no otra agencia
de viajes, comparador o chatbot de itinerarios.

## Estado actual (MVP — bloques B01 + explorador básico)

Este primer recorte demuestra el núcleo descrito en el prompt maestro:

> Usuario → describe el viaje → el sistema entiende sus necesidades →
> selecciona viajeros → comprueba compatibilidad → propone destino →
> crea el viaje → detecta requisitos → construye una primera estructura.

Implementado:

- **Pantalla principal** limpia con tres entradas: Explorar / Mis viajes / Viajeros.
- **Viajeros**: personas y mascotas como datos permanentes (documentos,
  nacionalidad, microchip, etc.), reutilizables en cualquier viaje.
- **Explorar un viaje**: traduce una descripción en lenguaje natural a
  variables estructuradas (duración, presupuesto, mascota, intereses,
  ritmo…) y calcula compatibilidad porcentual contra un dataset de
  destinos, con explicación de cada criterio.
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
    explorar/        explorador en lenguaje natural
  components/        UI compartida (cabecera, badge de estado)
  lib/
    types.ts         modelo de datos
    store.tsx         persistencia (localStorage) + contexto React
    destinos.ts       dataset de destinos de demostración
    explorador.ts     parseo NL → necesidades + scoring de compatibilidad
    requisitos.ts     motor de requisitos por viajero/destino
    edad.ts, id.ts    utilidades
```

## Próximos bloques

Explorador avanzado (LLM real), planificador de itinerario, transporte
combinado, alojamiento, Travel Vault, Travel Mode, adaptación dinámica,
modo resolver, viajes compartidos, memoria del viaje — ver el prompt
maestro del producto para el roadmap completo por bloques (B02–B20).
