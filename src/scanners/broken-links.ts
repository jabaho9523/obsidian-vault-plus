import { TFile } from "obsidian";
import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const brokenLinksScanner: Scanner = {
	id: "enableBrokenLinks",
	category: "broken-link",
	enabled: (s) => s.enableBrokenLinks,
	async run(ctx) {
		const issues: HealthIssue[] = [];
		for (const [sourcePath, unresolved] of Object.entries(
			ctx.unresolvedLinks
		)) {
			const source = ctx.app.vault.getAbstractFileByPath(sourcePath);
			if (!(source instanceof TFile)) continue;
			const cache = ctx.app.metadataCache.getFileCache(source);
			const refs = [
				...(cache?.links ?? []),
				...(cache?.embeds ?? []),
			];
			for (const linkText of Object.keys(unresolved)) {
				const ref = refs.find((r) => r.link === linkText);
				issues.push({
					id: `broken-link:${sourcePath}:${linkText}`,
					category: "broken-link",
					file: source,
					title: linkText,
					detail: source.basename,
					brokenLink: {
						linkText,
						line: ref?.position.start.line,
						col: ref?.position.start.col,
					},
				});
			}
		}
		return issues;
	},
};
