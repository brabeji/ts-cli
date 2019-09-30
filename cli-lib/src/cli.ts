import { CmdFactory, NamedCmdArgOptions, NamedArgFactory } from "./cmd-builder";
import { Cmd, CmdInterpretError } from "./cmd";
import { CmdParser, ParsedCmd, CmdParseError } from "./parser";
import { Errors, ErrorsImpl } from "./errors";
import { CmdAssembleError } from "./assembler";
import { mapObject } from "./utils";

export type CmdDescription<
	TCommand,
	TSharedNamedArgs extends Record<string, NamedCmdArgOptions>
> = (cmdFactory: CmdFactory<TCommand, TSharedNamedArgs>) => Cmd<TCommand>;

export type CliOptions<
	TCmdData,
	TSharedNamedArgs extends Record<string, NamedCmdArgOptions>
> = {
	sharedNamedArgs?: (f: NamedArgFactory) => TSharedNamedArgs;
	mainCmd?: CmdDescription<TCmdData, TSharedNamedArgs>;
	subCmds?: Record<string, CmdDescription<TCmdData, TSharedNamedArgs>>;
};

export type CliCmd<TCmdData> = { name: string | undefined } & Cmd<TCmdData>;

export class Cli<
	TCmdData,
	TSharedNamedArgs extends Record<string, NamedCmdArgOptions>
> {
	public readonly mainCmd: Cmd<TCmdData> | undefined;
	public readonly subCmds: Record<string, Cmd<TCmdData>>;

	constructor(options: CliOptions<TCmdData, TSharedNamedArgs>) {
		const factory = new CmdFactory<TCmdData, TSharedNamedArgs>();
		this.mainCmd = options.mainCmd && options.mainCmd(factory);
		this.subCmds = mapObject(options.subCmds || {}, val => val(factory));
	}

	public parse(
		argv: string[]
	):
		| { data: TCmdData }
		| {
				errors: Errors<
					| CmdParseError
					| CmdAssembleError
					| CmdInterpretError
					| CmdCliError
				>;
		  } {
		const parser = new CmdParser();
		const errors = new ErrorsImpl<
			CmdParseError | CmdAssembleError | CmdInterpretError | CmdCliError
		>();
		const parsedCmd = parser.parseArgs(argv);
		errors.addFrom(parsedCmd.errors);
		if (errors.hasErrors) {
			return { errors };
		}

		const result = this.processParsedCmd(parsedCmd);
		if ("errors" in result) {
			errors.addFrom(result.errors);
			return { errors };
		}
		return result;
	}

	protected processParsedCmd(
		parsedCmd: ParsedCmd
	):
		| { data: TCmdData }
		| {
				errors: Errors<
					| CmdParseError
					| CmdAssembleError
					| CmdInterpretError
					| CmdCliError
				>;
		  } {
		let cmd = this.mainCmd;
		const firstCmd = parsedCmd.parts[0];
		let selectedSubCmd =
			firstCmd && firstCmd.kind === "Value" ? firstCmd.value : undefined;
		if (selectedSubCmd) {
			const subs = this.subCmds;
			if (subs && selectedSubCmd in subs) {
				cmd = subs[selectedSubCmd];
				parsedCmd.parts.shift();
			}
		}

		if (!cmd) {
			return {
				errors: Errors.single(
					selectedSubCmd
						? {
								kind: "CommandNotFound",
								command: selectedSubCmd,
								message: `There is no command with name "${selectedSubCmd}".`,
						  }
						: {
								kind: "NoCommandSpecified",
								message: `No command specified.`,
						  }
				),
			};
		}

		return this.processParsedCmdForSelectedCmd(
			selectedSubCmd,
			cmd,
			parsedCmd
		);
	}

	protected processParsedCmdForSelectedCmd(
		cmdName: string | undefined,
		cmd: Cmd<TCmdData>,
		parsedCmd: ParsedCmd
	):
		| { data: TCmdData }
		| {
				errors: Errors<
					CmdParseError | CmdAssembleError | CmdInterpretError
				>;
		  } {
		const data = cmd.parseArgsAndGetData(parsedCmd);
		return data;
	}
}

export type CmdCliError =
	| {
			kind: "CommandNotFound";
			message: string;
			command: string;
	  }
	| {
			kind: "NoCommandSpecified";
			message: string;
	  };
