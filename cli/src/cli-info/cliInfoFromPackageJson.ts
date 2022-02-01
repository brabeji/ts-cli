import { CliInfo } from "./CliInfo";
/**
 * Reads general app info from a `package.json`.
 * @param absolutePathToPackageJson The absolute path to your `package.json`,
 * e.g. `join(__dirname, "./package.json")`.
 */
export function cliInfoFromPackageJson(
	absolutePathToPackageJson: string
): CliInfo {
	const pkgJson = require(absolutePathToPackageJson) as {
		name: string;
		version: string;
		bin?: Record<string, string>;
	};
	return {
		appName: pkgJson.name,
		commandName: pkgJson.bin ? Object.keys(pkgJson.bin)[0] : undefined,
		version: pkgJson.version || "0.0.1",
	};
}
