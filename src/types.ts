import { TFile } from "obsidian";

export type IssueCategory =
	| "orphan"
	| "broken-link"
	| "empty"
	| "oversized"
	| "duplicate"
	| "unused-tag"
	| "unref-attachment";

export const ALL_CATEGORIES: IssueCategory[] = [
	"orphan",
	"broken-link",
	"empty",
	"oversized",
	"duplicate",
	"unused-tag",
	"unref-attachment",
];

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
	orphan: "Orphan notes",
	"broken-link": "Broken links",
	empty: "Empty notes",
	oversized: "Oversized notes",
	duplicate: "Fuzzy duplicates",
	"unused-tag": "Unused tags",
	"unref-attachment": "Unreferenced attachments",
};

export interface HealthIssue {
	id: string;
	category: IssueCategory;
	file: TFile;
	title: string;
	detail?: string;
	brokenLink?: { linkText: string; line?: number; col?: number };
	duplicate?: { otherFile: TFile; distance: number };
	tagName?: string;
}

export type IssuesByCategory = Record<IssueCategory, HealthIssue[]>;

export interface ScanResults {
	issuesByCategory: IssuesByCategory;
	startedAt: number;
	finishedAt: number;
	fileCount: number;
}

export function emptyIssuesByCategory(): IssuesByCategory {
	return {
		orphan: [],
		"broken-link": [],
		empty: [],
		oversized: [],
		duplicate: [],
		"unused-tag": [],
		"unref-attachment": [],
	};
}

export function totalIssues(results: ScanResults): number {
	let n = 0;
	for (const cat of ALL_CATEGORIES) n += results.issuesByCategory[cat].length;
	return n;
}
