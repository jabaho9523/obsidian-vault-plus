import { App, TFile } from "obsidian";
import { HealthIssue, IssueCategory } from "../types";
import { VaultPlusSettings } from "../settings";

export interface ScanContext {
	app: App;
	settings: VaultPlusSettings;
	markdownFiles: readonly TFile[];
	allFiles: readonly TFile[];
	resolvedLinks: Record<string, Record<string, number>>;
	unresolvedLinks: Record<string, Record<string, number>>;
	reverseLinks: Map<string, Set<string>>;
}

export type ScannerOutput =
	| HealthIssue[]
	| { issues: HealthIssue[]; note: string };

export interface Scanner {
	id: string;
	category: IssueCategory;
	enabled: (s: VaultPlusSettings) => boolean;
	run: (ctx: ScanContext) => ScannerOutput | Promise<ScannerOutput>;
}
