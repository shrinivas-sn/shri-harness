export interface BuildOptions {
	single: boolean;
	skipInstall: boolean;
	skipSdkBuild: boolean;
	installNativeVariants: boolean;
	/**
	 * The hub dashboard webview is not part of the Shri terminal preview and
	 * its build currently fails outright (apps/cline-hub/src/webview isn't a
	 * workspace member, so its vite/@vitejs/plugin-react-swc/@tailwindcss/vite
	 * deps never get installed). Building it is an explicit, opt-in
	 * development step — never a silent default the terminal build depends on.
	 */
	withHubWebview: boolean;
}

export function parseBuildOptions(args: readonly string[]): BuildOptions {
	return {
		single: args.includes("--single"),
		skipInstall: args.includes("--skip-install"),
		skipSdkBuild: args.includes("--skip-sdk-build"),
		installNativeVariants: args.includes("--install-native-variants"),
		withHubWebview: args.includes("--with-hub-webview"),
	};
}

export function shouldBuildHubWebview(options: BuildOptions): boolean {
	return options.withHubWebview;
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
