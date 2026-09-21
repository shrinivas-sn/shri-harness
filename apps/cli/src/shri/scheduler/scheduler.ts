export type TaskWeight = "heavy" | "light";

interface ActiveTaskRecord {
	taskId: string;
	modelId: string;
	weight: TaskWeight;
}

/**
 * Model-Aware Execution Scheduler (Section 19).
 * Prevents concurrent heavy tasks hitting the same model and triggering HTTP 429 rate limits.
 */
export class ExecutionScheduler {
	private activeTasks: Map<string, ActiveTaskRecord> = new Map();

	/**
	 * Determines if a new task can run concurrently given currently active tasks.
	 */
	public canExecuteConcurrently(modelId: string, weight: TaskWeight): boolean {
		// Rule: Do not run multiple token-heavy agents concurrently against the same model
		if (weight === "heavy") {
			for (const active of this.activeTasks.values()) {
				if (active.modelId === modelId && active.weight === "heavy") {
					return false;
				}
			}
		}

		return true;
	}

	public registerRunningTask(taskId: string, modelId: string, weight: TaskWeight): void {
		this.activeTasks.set(taskId, { taskId, modelId, weight });
	}

	public completeTask(taskId: string): void {
		this.activeTasks.delete(taskId);
	}

	public getActiveTaskCount(): number {
		return this.activeTasks.size;
	}
}
