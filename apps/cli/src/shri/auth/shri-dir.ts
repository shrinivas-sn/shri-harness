import { homedir } from "node:os";
import { join } from "node:path";
import { setClineDir, setHomeDir } from "@cline/shared/storage";

/**
 * Returns the root configuration and data directory for Shri.
 * Defaults to ~/.shri unless overridden by the SHRI_DIR environment variable.
 */
export function resolveShriHomeDir(): string {
	const envDir = process.env.SHRI_DIR?.trim();
	if (envDir) {
		return envDir;
	}
	return join(homedir(), ".shri");
}

/**
 * Sets up Shri's storage isolation so all underlying Cline SDK storage resolvers
 * (settings, databases, session logs) point to ~/.shri instead of ~/.cline.
 *
 * Also sets process.env.CLINE_DIR: the hub daemon runs as a separate detached
 * process that only inherits process.env, not this process's in-memory
 * setClineDir() state. Without the env var, a spawned daemon re-resolves
 * resolveClineDir() from scratch and falls back to ~/.cline, silently
 * breaking isolation for any daemon-backed feature (dashboard, schedule,
 * connectors). Setting the env var lets resolveClineDir()'s existing
 * CLINE_DIR fallback carry the same directory into child processes.
 */
export function initShriEnvironment(): void {
	const shriDir = resolveShriHomeDir();
	setClineDir(shriDir);
	setHomeDir(homedir());
	process.env.CLINE_DIR = shriDir;
}
