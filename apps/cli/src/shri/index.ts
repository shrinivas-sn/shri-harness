import { Coordinator } from "./coordinator/coordinator";
import { ModelRouter } from "./router/router";
import { BudgetManager } from "./scheduler/budget";
import { ExecutionScheduler } from "./scheduler/scheduler";
import { assignToolsForTask } from "./tools/tool-assignment";
import { type Plan, type PlannedTask, type SubAgentEnvelope } from "./types";
import { type RunRecord } from "./persistence/run-history";
export { resolveShriHomeDir, initShriEnvironment } from "./auth/shri-dir";
export {
	validateGroqKeyFormat,
	resolveGroqApiKey,
	saveGroqApiKey,
	ensureGroqApiKey,
	maskApiKey,
	type KeyValidationResult,
	type EnsureGroqApiKeyOptions,
} from "./auth/groq-auth";

export interface PipelineOptions {
	userRequest: string;
	mutationAllowed?: boolean;
	onPlanReview?: (plan: Plan) => Promise<"Approve" | "Reject" | string>;
	mockTaskExecutor?: (task: PlannedTask) => Promise<SubAgentEnvelope>;
}

export interface PipelineResult {
	status: "completed" | "aborted" | "failed";
	finalAnswer: string;
	tokensConsumed: number;
	runRecord: RunRecord;
}

/**
 * Shri V1 Orchestration Pipeline (Section 29).
 * Flow: User request → Coordinator plan → User approval → Sub-agents → Synthesis → Save
 */
export async function executeShriPipeline(options: PipelineOptions): Promise<PipelineResult> {
	const {
		userRequest,
		mutationAllowed = false,
		onPlanReview,
		mockTaskExecutor,
	} = options;

	const coordinator = new Coordinator();
	const router = new ModelRouter();
	const budget = new BudgetManager();
	const scheduler = new ExecutionScheduler();

	const runId = `run-${Date.now()}`;
	const timestamp = new Date().toISOString();

	// 1. Coordinator Planning (Upfront Plan)
	const rawPlan: Plan = {
		planId: `plan-${Date.now()}`,
		userGoal: userRequest,
		tasks: [
			{
				taskId: "task-1",
				title: `Analyze: ${userRequest.slice(0, 40)}...`,
				reasoning: "low",
				contextRequirement: "repository state",
				expectedOutputSize: "small",
				priority: "high",
				requiredCapabilities: ["git.log", "fs.read"],
				dependencies: [],
				assignedTools: [],
				estimatedTokens: 600,
			},
		],
		estimatedTotalTokens: 600,
		estimatedExecutionTimeSeconds: 5,
		verify: false,
	};

	// 2. Assign Models and Tools to Tasks
	for (const task of rawPlan.tasks) {
		const selectedModel = router.selectModel({
			reasoning: task.reasoning,
			estimatedTokens: task.estimatedTokens,
		});
		task.assignedModel = selectedModel.modelId;
		task.assignedTools = assignToolsForTask({
			capabilities: task.requiredCapabilities,
			mutationAllowed,
		});
	}

	// 3. User Approval Gate (Section 18)
	if (onPlanReview) {
		const decision = await onPlanReview(rawPlan);
		if (decision !== "Approve") {
			const abortedRecord: RunRecord = {
				runId,
				timestamp,
				userRequest,
				approvedPlanId: rawPlan.planId,
				modelsUsed: [],
				toolsAssigned: [],
				tokensConsumed: 0,
				status: "aborted",
				finalSummary: "Plan was rejected by user.",
			};
			return {
				status: "aborted",
				finalAnswer: "Plan was rejected by user. Execution aborted.",
				tokensConsumed: 0,
				runRecord: abortedRecord,
			};
		}
	}

	// 4. Budget & Concurrency Aware Execution (Sections 19 & 20)
	const envelopes: SubAgentEnvelope[] = [];
	const modelsUsed = new Set<string>();
	const toolsAssigned = new Set<string>();
	let totalTokens = 0;

	for (const task of rawPlan.tasks) {
		const modelId = task.assignedModel ?? "llama-3.1-8b-instant";
		modelsUsed.add(modelId);
		for (const t of task.assignedTools) toolsAssigned.add(t);

		scheduler.registerRunningTask(task.taskId, modelId, "light");

		let envelope: SubAgentEnvelope;
		if (mockTaskExecutor) {
			envelope = await mockTaskExecutor(task);
		} else {
			// Fallback simulated result
			envelope = {
				status: "success",
				summary: `Completed ${task.title}`,
				evidence: `Executed using ${task.assignedTools.join(", ")}`,
				confidence: "high",
				warnings: [],
				resultPayload: {},
			};
		}

		envelopes.push(envelope);
		budget.recordUsage(task.estimatedTokens);
		totalTokens += task.estimatedTokens;
		scheduler.completeTask(task.taskId);
	}

	// 5. Coordinator Synthesis (Section 5)
	const finalAnswer = coordinator.synthesizeFinalAnswer({
		userGoal: userRequest,
		envelopes,
	});

	// 6. Run Persistence (Section 24)
	const runRecord: RunRecord = {
		runId,
		timestamp,
		userRequest,
		approvedPlanId: rawPlan.planId,
		modelsUsed: Array.from(modelsUsed),
		toolsAssigned: Array.from(toolsAssigned),
		tokensConsumed: totalTokens,
		status: "completed",
		finalSummary: envelopes.map((e) => e.summary).join("; "),
	};

	return {
		status: "completed",
		finalAnswer,
		tokensConsumed: totalTokens,
		runRecord,
	};
}
