import type { BrainState } from "./brainState";
import type { BrainAction } from "./brainActions";
import { decideNextAction, type BrainDecision } from "./decisionEngine";
import { executeAgents } from "./agentRuntime";
import type { AgentResult } from "./agentRuntime";

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

/**
 * Central execution boundary. It deliberately delegates data-producing work
 * to the existing agent runtime instead of allowing individual departments
 * to implement their own loops.
 */
export function createBrainActionExecutor(): BrainActionExecutor {
  return {
    async execute(state, action) {
      const now = new Date().toISOString();
      const requirements = state.requirements.filter((requirement) =>
        requirement.id === action.target || requirement.dataType === action.target,
      );
      const agents = state.agents.filter((agent) =>
        requirements.some((requirement) => requirement.agentId === agent.id),
      );

      if (!requirements.length) {
        const execution: ActionExecution = {
          actionId: action.id,
          actionType: action.type,
          target: action.target,
          status: "waiting",
          reason: "La acción no tiene todavía un requisito ejecutable asociado.",
          resultIds: [],
          createdAt: now,
        };
        return { cycle: state.controlCycles.length + 1, action, execution, results: [] };
      }

      try {
        const results = await executeAgents(requirements, agents, state.context, state.facts);
        const ready = results.filter((result) => result.status === "ready" && result.validation.valid);
        const failed = results.filter((result) => result.status === "error");
        const execution: ActionExecution = {
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
        };
        return { cycle: state.controlCycles.length + 1, action, execution, results };
      } catch (error) {
        const execution: ActionExecution = {
          actionId: action.id,
          actionType: action.type,
          target: action.target,
          status: "failed",
          reason: error instanceof Error ? error.message : "Error desconocido durante la ejecución.",
          resultIds: [],
          createdAt: now,
        };
        return { cycle: state.controlCycles.length + 1, action, execution, results: [] };
      }
    },
  };
}

export function selectExecutableAction(state: BrainState): BrainAction | null {
  return state.decision?.action ?? null;
}

export function isActionSatisfied(action: BrainAction, results: AgentResult[]): boolean {
  return results.some((result) =>
    result.status === "ready" && result.validation.valid &&
    (result.requirementId === action.target || result.dataType === action.target),
  );
}

export function recalculateDecision(state: BrainState): BrainDecision {
  return decideNextAction(state.context, state.pendingActions, state.results, []);
}
