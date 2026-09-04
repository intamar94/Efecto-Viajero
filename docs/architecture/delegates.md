# Delegates de inteligencia

Un delegate es una frontera de ingeniería para una capacidad del viaje. No es un chatbot aislado ni una base de conocimiento independiente.

| Delegate | Responsabilidad |
|---|---|
| destination-resolver | Convertir cualquier texto de lugar en una entidad geográfica canónica. |
| accommodation-intelligence | Encontrar, normalizar y valorar alojamientos según el viaje. |
| transport-intelligence | Resolver desplazamientos y conexiones multimodales. |
| activity-intelligence | Encontrar actividades compatibles con el contexto. |
| culture-intelligence | Lugares, patrimonio, eventos y contexto cultural. |
| gastronomy-intelligence | Comida local, restaurantes y experiencias gastronómicas. |
| nature-intelligence | Naturaleza, senderos, parques y actividades exteriores. |
| requirements-intelligence | Requisitos por destino, nacionalidad y viajero. |
| weather-intelligence | Condiciones actuales y previsión que afectan al plan. |
| personalized-map | Priorizar lugares y rutas según ubicación + viaje + momento. |
| offline-travel | Preparar y servir el contexto que debe sobrevivir sin conexión. |

## Contrato común

Cada delegate recibe contexto del viaje y devuelve datos estructurados con evidencia cuando la información es externa.

```ts
interface IntelligenceDelegate<TInput, TOutput> {
  id: string;
  domain: string;
  run(input: TInput): Promise<TOutput>;
}
```

Los delegates actuales son el esqueleto de integración. Las implementaciones reales se conectan progresivamente a proveedores/fuentes verificables; no se presentan como datos reales mientras no exista una fuente conectada.
