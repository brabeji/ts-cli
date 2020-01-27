import {
	CliDefaultGlobalArgs,
	Cli,
	cliToSchema,
	sSchema,
} from "@hediet/cli-lib";
import { printCmdHelp } from "./printCmdHelp";
import { printCliHelp } from "./printCliHelp";
import { showGui } from "./showGui";

export interface CliInfo {
	appName: string;
	version: string;
}

export function runCliWithDefaultArgs<TCmdData>(options: {
	cli: Cli<TCmdData, CliDefaultGlobalArgs>;
	info: CliInfo;
	dataHandler: (data: TCmdData) => Promise<void>;
	args?: string[];
}) {
	const cmdArgs = options.args || process.argv.slice(2);
	const result = options.cli.parse(cmdArgs);

	function showHelp() {
		console.log();
		if (!result.parsedArgs["help"] && result.errors) {
			for (const e of result.errors.errors) {
				console.error(e.message);
			}

			console.log();
		}
		if (result.selectedCmd) {
			printCmdHelp(
				{
					cmdName: result.selectedCmd.name,
					appName: options.info.appName,
				},
				result.selectedCmd
			);
		} else {
			printCliHelp(options.cli, options.info);
		}
		console.log();
	}

	function run(data: TCmdData) {
		options.dataHandler(data).catch(e => {
			// todo
			console.error(e);
		});
	}

	if (result.parsedArgs["help"]) {
		showHelp();
		return;
	} else if (result.parsedArgs["version"]) {
		console.log(`version: ${options.info.version}`);
		return;
	} else if (result.parsedArgs["cmd::gui"]) {
		showGui(options.cli, run, result.selectedCmd);
		return;
	} else if (result.parsedArgs["cmd::schema"]) {
		const schema = cliToSchema(options.cli);
		const json = sSchema.serialize(schema);
		console.log(JSON.stringify(json, undefined, 4));
		return;
	} else if (result.parsedArgs["cmd::json-args"] !== undefined) {
		const jsonStr = result.parsedArgs["cmd::json-args"];
		const json = JSON.parse(jsonStr);
		const cmd = options.cli
			.getSerializer()
			.deserializeTyped(json)
			.unwrap();
		const data = cmd.getData();
		run(data);
		return;
	} else if (result.errors.hasErrors) {
		showHelp();
		return;
	}

	if (!result.dataFactory) {
		throw new Error("Error");
	}

	const data = result.dataFactory();
	run(data);
}