import type { ProviderSettingsManager } from "@cline/core";
import { resolveCompactionProviderConfig } from "../../runtime/interactive/compaction";
import {
	type DiscoveryFetch,
	discoverGroqModels,
	type GroqDiscoveryErrorKind,
	type ReconcilableGroqModel,
	reconcileGroqModels,
} from "../../utils/groq-model-discovery";
import type { Config } from "../../utils/types";

export const GROQ_PROVIDER_ID = "groq";
export const AVAILABILITY_NOT_VERIFIED = "Availability not verified";
export const GROQ_MANUAL_MODEL_WARNING =
	"Tool and reasoning support for manually entered models is not verified.";

export type GroqModelChoices =
	| { status: "verified"; eligibleIds: string[]; unverifiedIds: string[] }
	| { status: "unverified"; kind: GroqDiscoveryErrorKind; message: string };

/**
 * Lists the models the session's effective Groq connection can call.
 *
 * Connection fields come from the same resolver the interactive runtime uses
 * for its own model calls (session key over stored key, stored endpoint and
 * headers, builtin defaults), so a temporary key is never swapped for a saved
 * one. Nothing is written to settings or config.
 */
export async function loadGroqModelChoices(input: {
	config: Config;
	settings: Pick<ProviderSettingsManager, "getProviderSettings">;
	signal?: AbortSignal;
	fetch?: DiscoveryFetch;
}): Promise<GroqModelChoices> {
	const connection = resolveCompactionProviderConfig(
		input.config,
		input.settings as ProviderSettingsManager,
	);
	const result = await discoverGroqModels({
		baseUrl: connection.baseUrl ?? "",
		apiKey: connection.apiKey,
		headers: connection.headers,
		signal: input.signal,
		fetch: input.fetch,
	});
	if (result.status === "error") {
		return { status: "unverified", kind: result.kind, message: result.message };
	}
	const { eligible, unverified } = reconcileGroqModels(
		result.ids,
		(input.config.knownModels ?? {}) as Record<string, ReconcilableGroqModel>,
	);
	return {
		status: "verified",
		eligibleIds: eligible,
		unverifiedIds: unverified,
	};
}

/**
 * Chooses which catalog entries the picker shows. Verified discovery shows
 * only eligible models (possibly none); failed discovery keeps the cached
 * catalog but says its availability is not verified.
 */
export function selectGroqPickerModels<T>(
	choices: GroqModelChoices,
	knownModels: Record<string, T> | undefined,
): { models: Record<string, T>; notice?: string } {
	if (choices.status === "unverified") {
		return {
			models: knownModels ?? {},
			notice: `${AVAILABILITY_NOT_VERIFIED}: ${choices.message}`,
		};
	}
	const models = Object.fromEntries(
		choices.eligibleIds.flatMap((id) =>
			knownModels && Object.hasOwn(knownModels, id)
				? [[id, knownModels[id]] as const]
				: [],
		),
	) as Record<string, T>;
	const unverifiedCount = choices.unverifiedIds.length;
	const notice =
		choices.eligibleIds.length === 0 && unverifiedCount === 0
			? "Groq listed no models for this key. Use Create custom model ID to enter one."
			: unverifiedCount > 0
				? `${unverifiedCount} listed model${unverifiedCount === 1 ? " lacks" : "s lack"} capability data; enter ${unverifiedCount === 1 ? "it" : "them"} with Create custom model ID.`
				: undefined;
	return { models, notice };
}

/** Lets only the most recent discovery run update the picker. */
export class DiscoveryGate {
	private current: AbortController | undefined;

	begin(): { signal: AbortSignal; isCurrent: () => boolean } {
		this.current?.abort();
		const controller = new AbortController();
		this.current = controller;
		return {
			signal: controller.signal,
			isCurrent: () =>
				this.current === controller && !controller.signal.aborted,
		};
	}

	cancel(): void {
		this.current?.abort();
		this.current = undefined;
	}
}

export type ThinkingChoice = "none" | "low" | "medium" | "high" | "xhigh";

export interface PickerModel {
	key: string;
	name: string;
	supportsReasoning: boolean;
}

export interface ModelSelectionState {
	modelId: string;
	thinking: boolean | undefined;
	reasoningEffort: Config["reasoningEffort"];
}

export type ModelPick =
	| { kind: "model"; key: string }
	| { kind: "change-provider" }
	| undefined;

export type ModelPickResult =
	| { kind: "selected"; selection: ModelSelectionState }
	| { kind: "change-provider" }
	| { kind: "cancelled" };

export function currentThinkingLevel(
	config: Pick<Config, "thinking" | "reasoningEffort">,
): ThinkingChoice {
	if (config.reasoningEffort) return config.reasoningEffort as ThinkingChoice;
	return config.thinking ? "medium" : "none";
}

/**
 * Runs the model and reasoning dialogs without touching config. Escape in the
 * reasoning dialog returns to the model list; the caller commits the staged
 * selection only once every dialog has succeeded.
 */
export async function pickModelSelection(input: {
	config: Pick<Config, "thinking" | "reasoningEffort">;
	models: readonly PickerModel[];
	chooseModel: () => Promise<ModelPick>;
	chooseThinking: (
		model: PickerModel,
		current: ThinkingChoice,
	) => Promise<ThinkingChoice | undefined>;
}): Promise<ModelPickResult> {
	while (true) {
		const pick = await input.chooseModel();
		if (!pick) return { kind: "cancelled" };
		if (pick.kind === "change-provider") return pick;

		const model = input.models.find((m) => m.key === pick.key);
		if (!model?.supportsReasoning) {
			return {
				kind: "selected",
				selection: {
					modelId: pick.key,
					thinking: false,
					reasoningEffort: undefined,
				},
			};
		}
		const level = await input.chooseThinking(
			model,
			currentThinkingLevel(input.config),
		);
		if (level === undefined) continue;
		return {
			kind: "selected",
			selection:
				level === "none"
					? { modelId: pick.key, thinking: false, reasoningEffort: undefined }
					: { modelId: pick.key, thinking: true, reasoningEffort: level },
		};
	}
}

function snapshot(config: Config): ModelSelectionState {
	return {
		modelId: config.modelId,
		thinking: config.thinking,
		reasoningEffort: config.reasoningEffort,
	};
}

function assign(config: Config, state: ModelSelectionState): void {
	config.modelId = state.modelId;
	config.thinking = state.thinking;
	config.reasoningEffort = state.reasoningEffort;
}

/**
 * Writes a staged selection into config and applies it through the existing
 * model-change path. If applying fails, the previous in-memory model and
 * reasoning are restored. Key and endpoint are never changed here.
 */
export async function applyModelSelection(
	config: Config,
	selection: ModelSelectionState,
	apply: () => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
	const previous = snapshot(config);
	assign(config, selection);
	try {
		await apply();
		return { ok: true };
	} catch (error) {
		assign(config, previous);
		return { ok: false, error };
	}
}
