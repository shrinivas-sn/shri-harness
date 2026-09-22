import { homedir } from "node:os";
import { join } from "node:path";
import { setClineDir, setHomeDir } from "@cline/shared/storage";

/**
 * Returns the root configuration and data directory for Shri.
 * Defaults to ~/.shri unless overridden by the SHRI_DIR environment variable.
 */
export function resolveShriHomeDir(configDir?: string): string {
	const explicitDir = configDir?.trim();
	if (explicitDir) {
		return explicitDir;
	}
	const envDir = process.env.SHRI_DIR?.trim();
	if (envDir) {
		return envDir;
	}
	return join(homedir(), ".shri");
}

/**
 * Sets up Shri's storage isolation so all underlying Cline SDK storage resolvers
 * (settings, databases, session logs) point to ~/.shri instead of ~/.cline.
 */
export function initShriEnvironment(configDir?: string): void {
	const shriDir = resolveShriHomeDir(configDir);
	const dataDir = join(shriDir, "data");
	const settingsDir = join(dataDir, "settings");
	// The SDK resolver caches process-local paths, while daemon and connector
	// children resolve the same locations from these environment conventions.
	// Override inherited Cline paths so a child cannot fall back to ~/.cline.
	Object.assign(process.env, {
		CLINE_DIR: shriDir,
		CLINE_DATA_DIR: dataDir,
		CLINE_SESSION_DATA_DIR: join(dataDir, "sessions"),
		CLINE_TEAM_DATA_DIR: join(dataDir, "teams"),
		CLINE_CONNECTOR_DATA_DIR: join(dataDir, "connectors"),
		CLINE_DB_DATA_DIR: join(dataDir, "db"),
		CLINE_PROVIDER_SETTINGS_PATH: join(settingsDir, "providers.json"),
		CLINE_GLOBAL_SETTINGS_PATH: join(settingsDir, "global-settings.json"),
		CLINE_MCP_SETTINGS_PATH: join(settingsDir, "cline_mcp_settings.json"),
	});
	setClineDir(shriDir);
	setHomeDir(homedir());
}
