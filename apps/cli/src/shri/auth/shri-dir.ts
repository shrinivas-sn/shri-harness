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
 */
export function initShriEnvironment(): void {
	const shriDir = resolveShriHomeDir();
	setClineDir(shriDir);
	setHomeDir(homedir());
}
