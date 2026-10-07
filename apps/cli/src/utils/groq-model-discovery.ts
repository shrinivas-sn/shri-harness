import { isChatCompatibleModel } from "@cline/shared";
import type { ChatCatalogModel } from "./chat-models";

export const GROQ_DISCOVERY_TIMEOUT_MS = 5_000;

export type DiscoveryFetch = (
	url: string,
	init: RequestInit,
) => Promise<Response>;

export type GroqDiscoveryErrorKind =
	| "auth"
	| "timeout"
	| "network"
	| "response"
	| "cancelled";

export type GroqDiscoveryResult =
	| { status: "ok"; ids: string[] }
	| { status: "error"; kind: GroqDiscoveryErrorKind; message: string };

/**
 * Resolved connection fields, matching what inference will use. The helper
 * never reads or writes saved settings, so a temporary key or endpoint
 * override is honored exactly as given.
 */
export interface GroqDiscoveryInput {
	baseUrl: string;
	apiKey?: string;
	headers?: Readonly<Record<string, string>>;
	signal?: AbortSignal;
	fetch?: DiscoveryFetch;
	/** Deadline covering the request and body parsing. */
	timeoutMs?: number;
}

// Fixed messages: errors must never echo the key, headers, URL, or body.
const ERROR_MESSAGES: Record<GroqDiscoveryErrorKind, string> = {
	auth: "Groq rejected the API key while listing models.",
	timeout: "Groq did not return its model list in time.",
	network: "Could not reach the Groq models endpoint.",
	response: "Groq returned an unusable model list.",
	cancelled: "Model discovery was cancelled.",
};

function failure(kind: GroqDiscoveryErrorKind): GroqDiscoveryResult {
	return { status: "error", kind, message: ERROR_MESSAGES[kind] };
}

class DiscoveryFailure extends Error {
	constructor(readonly kind: GroqDiscoveryErrorKind) {
		super(kind);
	}
}

function modelsUrl(baseUrl: string): string | undefined {
	const normalized = baseUrl.trim().replace(/\/+$/, "");
	return normalized && URL.canParse(normalized)
		? `${normalized}/models`
		: undefined;
}

function requestHeaders(
	headers: Readonly<Record<string, string>> | undefined,
	apiKey: string | undefined,
): Record<string, string> {
	const result = { ...(headers ?? {}) };
	const key = apiKey?.trim();
	if (
		key &&
		!Object.keys(result).some((name) => name.toLowerCase() === "authorization")
	) {
		result.Authorization = `Bearer ${key}`;
	}
	return result;
}

function statusFailure(response: Response): GroqDiscoveryErrorKind | undefined {
	if (
		response.redirected ||
		response.type === "opaqueredirect" ||
		(response.status >= 300 && response.status < 400)
	) {
		return "response";
	}
	if (response.status === 401 || response.status === 403) return "auth";
	return response.ok ? undefined : "response";
}

function parseModelIds(body: string): string[] {
	let payload: unknown;
	try {
		payload = JSON.parse(body);
	} catch {
		throw new DiscoveryFailure("response");
	}
	const data =
		payload && typeof payload === "object" && !Array.isArray(payload)
			? (payload as { data?: unknown }).data
			: undefined;
	if (!Array.isArray(data)) throw new DiscoveryFailure("response");

	const ids = data.map((entry) => {
		const id =
			entry && typeof entry === "object"
				? (entry as { id?: unknown }).id
				: undefined;
		const trimmed = typeof id === "string" ? id.trim() : "";
		if (!trimmed) throw new DiscoveryFailure("response");
		return trimmed;
	});
	return [...new Set(ids)];
}

/** Rejects as soon as `signal` aborts, even if `promise` ignores it. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		if (signal.aborted) return onAbort();
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", onAbort);
		});
	});
}

/**
 * Lists model IDs from a Groq (OpenAI-compatible) `/models` endpoint.
 *
 * One bounded GET, no retries, no redirects, no fallback endpoint. An empty
 * list is a success; every failure is a typed error so callers can never
 * mistake it for "no models".
 */
export async function discoverGroqModels(
	input: GroqDiscoveryInput,
): Promise<GroqDiscoveryResult> {
	if (input.signal?.aborted) return failure("cancelled");
	const url = modelsUrl(input.baseUrl);
	if (!url) return failure("network");

	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, input.timeoutMs ?? GROQ_DISCOVERY_TIMEOUT_MS);
	const onCallerAbort = () => controller.abort();
	input.signal?.addEventListener("abort", onCallerAbort, { once: true });

	const fetchFn = input.fetch ?? globalThis.fetch;
	try {
		const ids = await untilAborted(
			(async () => {
				let response: Response;
				try {
					response = await fetchFn(url, {
						method: "GET",
						headers: requestHeaders(input.headers, input.apiKey),
						redirect: "manual",
						signal: controller.signal,
					});
				} catch {
					throw new DiscoveryFailure("network");
				}
				const statusKind = statusFailure(response);
				if (statusKind) throw new DiscoveryFailure(statusKind);
				let body: string;
				try {
					body = await response.text();
				} catch {
					throw new DiscoveryFailure("network");
				}
				return parseModelIds(body);
			})(),
			controller.signal,
		);
		return { status: "ok", ids };
	} catch (error) {
		if (input.signal?.aborted) return failure("cancelled");
		if (timedOut) return failure("timeout");
		return failure(error instanceof DiscoveryFailure ? error.kind : "network");
	} finally {
		clearTimeout(timer);
		input.signal?.removeEventListener("abort", onCallerAbort);
	}
}

export type ReconcilableGroqModel = ChatCatalogModel & {
	readonly capabilities?: readonly string[];
};

export interface GroqModelReconciliation {
	/** Listed by the endpoint and proven chat- and tool-capable by the catalog. */
	eligible: string[];
	/** Listed by the endpoint but lacking capability evidence; manual entry only. */
	unverified: string[];
}

/**
 * Combines endpoint membership (what this key can call) with catalog facts
 * (what the model can do). Catalog-only models are never offered, known
 * non-chat or tool-incapable models are excluded, and nothing is inferred
 * from model names or token limits. Output follows endpoint order.
 */
export function reconcileGroqModels(
	discoveredIds: readonly string[],
	catalog: Readonly<Record<string, ReconcilableGroqModel>>,
): GroqModelReconciliation {
	const eligible: string[] = [];
	const unverified: string[] = [];
	for (const id of discoveredIds) {
		const model = Object.hasOwn(catalog, id) ? catalog[id] : undefined;
		if (
			!model ||
			(isChatCompatibleModel(model) && !model.capabilities?.length)
		) {
			unverified.push(id);
		} else if (
			isChatCompatibleModel(model) &&
			model.capabilities?.includes("tools")
		) {
			eligible.push(id);
		}
	}
	return { eligible, unverified };
}
