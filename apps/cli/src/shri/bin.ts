#!/usr/bin/env bun
import { executeShriPipeline } from "./index";

async function main() {
	const args = process.argv.slice(2);
	const prompt = args.join(" ").trim();

	console.log("\n⚡ Shri V1: Terminal-First Multi-Agent Orchestration Harness\n");

	if (!prompt) {
		console.log("Usage: shri \"<task description>\"\n");
		console.log("Example:");
		console.log("  shri \"Analyze repository git history and check build status\"");
		console.log("  shri \"Review package dependencies for security vulnerabilities\"\n");
		process.exit(0);
	}

	console.log(`🎯 Request: "${prompt}"\n`);
	console.log("⏳ Coordinator generating upfront plan via Groq (openai/gpt-oss-120b)...");

	const result = await executeShriPipeline({
		userRequest: prompt,
		mutationAllowed: false,
		onPlanReview: async (plan) => {
			console.log("\n📋 Pre-Execution Plan:");
			console.log(`   Plan ID: ${plan.planId}`);
			console.log(`   Estimated Tokens: ${plan.estimatedTotalTokens}`);
			console.log(`   Estimated Time: ~${plan.estimatedExecutionTimeSeconds}s`);
			console.log("\n   Planned Tasks:");
			for (const t of plan.tasks) {
				console.log(`   • [${t.assignedModel ?? "llama-3.1-8b"}] ${t.title}`);
				console.log(`     Tools: ${t.assignedTools.join(", ") || "none"}`);
			}
			console.log("\n✅ Auto-approving execution for terminal session...\n");
			return "Approve";
		},
	});

	console.log("\n---------------------------------------------------------");
	console.log(result.finalAnswer);
	console.log("---------------------------------------------------------");
	console.log(`📊 Tokens Consumed: ${result.tokensConsumed}`);
	console.log(`💾 Run Record Saved: ${result.runRecord.runId}\n`);
}

main().catch((err) => {
	console.error("❌ Shri Execution Error:", err);
	process.exit(1);
});
