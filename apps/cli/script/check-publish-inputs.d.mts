export interface PublishPackage {
	name: string;
	version: string;
	target: string;
	path: string;
	sha256: string;
}

export function validatePublishInputs(
	report: unknown,
	artifactRoot: string,
	version: string,
	targets: string[],
): PublishPackage[];
