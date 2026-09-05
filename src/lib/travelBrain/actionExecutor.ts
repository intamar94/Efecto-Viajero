import type { BrainState } from "./brainState";
import type { BrainAction } from "./brainActions";
import { decideNextAction, type BrainDecision } from "./decisionEngine";
import { executeAgents } from "./agentRuntime";
import type { AgentResult } from "./agentRuntime";
import type { ResolvedDestination } from "./destinationResolver";

export type ActionExecutionStatus = "executed" | "waiting" | "blocked" | "failed";

export interface ActionExecution {
  actionId: string;
  actionType: BrainAction["type"];
  target: string;
  status: ActionExecutionStatus;
  reason: string;
  resultIds: string[];
  createdAt: string;
}

export interface BrainExecutionCycle {
  cycle: number;
  action: BrainAction;
  execution: ActionExecution;
  results: AgentResult[];
  nextDecision?: BrainDecision;
}

export interface BrainActionExecutor {
  execute(state: BrainState, action: BrainAction): Promise<BrainExecutionCycle>;
}

export interface BrainExecutionDependencies {
  locations: ResolvedDestination[];
}

function requirementsForAction(state: BrainState, action: BrainAction) {
  const dependencyIds = new Set(action.dependsOn);
  const byId = state.requirements.filter((requirement) => dependencyIds.has(requirement.id));
  if (byId.length) return byId;
  return state.requirements.filter((requirement) => requirement.id === action.target || requirement.dataType === action.target);
}

export function createBrainActionExecutor(dependencies: BrainExecutionDependencies): BrainActionExecutor {
  return {
    async execute(state, action) {
      const now = new Date().toISOString();
      const requirements = requirementsForAction(state, action);
      const agents = state.agents.filter((agent) => requirements.some((requirement) => requirement.agentId === agent.id));

      if (!requirements.length || !agents.length) {
        return {
          cycle: state.controlCycles.length + 1,
          action,
          execution: {
            actionId: action.id,
            actionType: action.type,
            target: action.target,
            status: "waiting",
            reason: "La acción no tiene todavía un requisito y agente ejecutables asociados.",
            resultIds: [],
            createdAt: now,
          },
          results: [],
        };
      }

      try {
        const results = await executeAgents(requirements, agents, state.context, dependencies.locations);
        const ready = results.filter((result) => result.status === "ready" && result.validation.valid);
        const failed = results.filter((result) => result.status === "error");
        return {
          cycle: state.controlCycles.length + 1,
          action,
          execution: {
            actionId: action.id,
            actionType: action.type,
            target: action.target,
            status: ready.length ? "executed" : failed.length ? "failed" : "waiting",
            reason: ready.length
              ? `La ejecución produjo ${ready.length} resultado(s) validado(s).`
              : failed.length
                ? `La ejecución produjo ${failed.length} error(es); el cerebro debe recuperarse.`
                : "La ejecución terminó sin un resultado validado.",
            resultIds: results.map((result) => result.requirementId),
            createdAt: now,
          },
          results,
        };
      } catch (error) {
        return {
          cycle: state.controlCycles.length + 1,
          action,
          execution: {
            actionId: action.id,
            actionType: action.type,
            target: action.target,
            status: "failed",
            reason: error instanceof Error ? error.message : "Error desconocido durante la ejecución.",
            resultIds: [],
            createdAt: now,
          },
          results: [],
        };
      }
    },
  };
}

export function selectExecutableAction(state: BrainState): BrainAction | null {
  return state.decision?.action ?? null;
}

export function isActionSatisfied(action: BrainAction, results: AgentResult[]): boolean {
  return results.some((result) => result.status === "ready" && result.validation.valid && (result.requirementId === action.target || result.dataType === action.target));
}

export function recalculateDecision(state: BrainState): BrainDecision {
  return decideNextAction(state.context, state.pendingActions, state.results, []);
}
