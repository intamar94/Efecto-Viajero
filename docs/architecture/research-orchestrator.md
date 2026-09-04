# Research Orchestrator — Efecto Viajero

The Research Orchestrator is the single routing layer between user intent and destination intelligence. UI tabs must not independently decide what to research.

## Pipeline

USER TEXT / TRIP STATE → DECONSTRUCTOR → RESEARCH PLAN → DELEGATES → EVIDENCE → TRAVEL BRAIN → UI

## Delegation domains

Destination, requirements, laws, emergency, transport, accommodation, weather, map, events, gastronomy, culture, nature, activities, language, currency, memory, social, expenses and offline.

## Rules

1. Every user request is deconstructed into explicit and implicit intent fragments.
2. Safety and factual domains are not silently removed because the user did not mention them.
3. User signals can promote domains to higher priority.
4. Independent domains execute concurrently.
5. One failed delegate produces an isolated error/partial state rather than breaking the trip.
6. Destination-dependent delegates receive the same TripState.
7. Every factual provider result should carry source, checkedAt, freshness and confidence.
8. A circuit applies the same delegation to every stage and additionally requires connection/route analysis between stages.
9. Changes to the trip should trigger a delta research plan instead of rebuilding unrelated information.
10. The user sees one Efecto Viajero experience, never a collection of agents.

## Completeness principle

If the user writes something not understood, it must remain visible as unresolved intent rather than being discarded. Future LLM extraction/provider adapters can enrich the deconstructor without changing the orchestration contract.
