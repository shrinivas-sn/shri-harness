import { describe, expect, it } from "vitest";
import {
	parseBuildOptions,
	shouldInstallNativeVariants,
	validateBuildOptions,
} from "../../script/build-options";

describe("CLI build options", () => {
	it("defaults to a terminal-only build and requires an explicit webview opt-in", () => {
		expect(parseBuildOptions([]).withHubWebview).toBe(false);
		expect(parseBuildOptions(["--with-hub-webview"]).withHubWebview).toBe(
			true,
		);
	});

	it("rejects builds with no supported host target", () => {
		expect(
			validateBuildOptions({
				options: parseBuildOptions(["--single"]),
				opentuiVersion: "0.1.102",
				targetCount: 0,
			}),
		).toBe("No matching targets for this platform.");
	});

	it("rejects unsupported build flags instead of silently ignoring them", () => {
		expect(
			validateBuildOptions({
				options: parseBuildOptions(["--not-a-real-build-option"]),
				opentuiVersion: "0.1.102",
				targetCount: 1,
			}),
		).toBe("Unsupported build option: --not-a-real-build-option");
	});

	it("does not install native variants during single-platform builds by default", () => {
		const options = parseBuildOptions(["--single"]);

		expect(options.single).toBe(true);
		expect(
			shouldInstallNativeVariants({
				options,
				opentuiVersion: "0.1.102",
			}),
		).toBe(false);
		expect(
			validateBuildOptions({
				options,
				opentuiVersion: "0.1.102",
				targetCount: 1,
			}),
		).toBeUndefined();
	});

	it("requires explicit native variant install for cross-platform OpenTUI builds", () => {
		const options = parseBuildOptions([]);

		expect(
			validateBuildOptions({
				options,
				opentuiVersion: "0.1.102",
				targetCount: 6,
			}),
		).toContain("--install-native-variants");
	});

	it("allows cross-platform builds to opt into native variant installation", () => {
		const options = parseBuildOptions(["--install-native-variants"]);

		expect(
			shouldInstallNativeVariants({
				options,
				opentuiVersion: "0.1.102",
			}),
		).toBe(true);
		expect(
			validateBuildOptions({
				options,
				opentuiVersion: "0.1.102",
				targetCount: 6,
			}),
		).toBeUndefined();
	});
});
