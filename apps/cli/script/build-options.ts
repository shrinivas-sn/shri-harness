export interface BuildOptions {
	single: boolean;
	skipInstall: boolean;
	skipSdkBuild: boolean;
	installNativeVariants: boolean;
	withHubWebview: boolean;
	unsupported: readonly string[];
}

export function parseBuildOptions(args: readonly string[]): BuildOptions {
	const supported = new Set([
		"--single",
		"--skip-install",
		"--skip-sdk-build",
		"--install-native-variants",
		"--with-hub-webview",
	]);
	return {
		single: args.includes("--single"),
		skipInstall: args.includes("--skip-install"),
		skipSdkBuild: args.includes("--skip-sdk-build"),
		installNativeVariants: args.includes("--install-native-variants"),
		withHubWebview: args.includes("--with-hub-webview"),
		unsupported: args.filter((arg) => !supported.has(arg)),
	};
}

export function shouldInstallNativeVariants(input: {
	options: BuildOptions;
	opentuiVersion: string | undefined;
}): boolean {
	return Boolean(
		input.opentuiVersion &&
			input.options.installNativeVariants &&
			!input.options.skipInstall,
	);
}

export function validateBuildOptions(input: {
	options: BuildOptions;
	opentuiVersion: string | undefined;
	targetCount: number;
}): string | undefined {
	const unsupported = input.options.unsupported[0];
	if (unsupported) {
		return `Unsupported build option: ${unsupported}`;
	}
	if (input.targetCount === 0) {
		return "No matching targets for this platform.";
	}
	if (
		input.opentuiVersion &&
		!input.options.single &&
		!input.options.skipInstall &&
		!input.options.installNativeVariants
	) {
		return [
			"Cross-platform OpenTUI builds require native package variants.",
			"Pass --install-native-variants to allow the build script to run bun install for all OpenTUI native packages.",
			"Pass --skip-install only when those packages are already installed.",
		].join("\n");
	}
	return undefined;
}
