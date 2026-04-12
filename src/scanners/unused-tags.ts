import { TFile } from "obsidian";
import { HealthIssue } from "../types";
import { Scanner } from "./types";
import { normalizeTag } from "../util/files";

export const unusedTagsScanner: Scanner = {
	id: "enableUnusedTags",
	category: "unused-tag",
	enabled: (s) => s.enableUnusedTags,
	async run(ctx) {
		const tagToFiles = new Map<string, Set<TFile>>();
		for (const f of ctx.markdownFiles) {
			const cache = ctx.app.metadataCache.getFileCache(f);
			if (!cache) continue;
			const inline = (cache.tags ?? []).map((t) => t.tag);
			const fm: unknown = cache.frontmatter?.["tags"];
			let fmTags: string[] = [];
			if (Array.isArray(fm)) fmTags = fm.map((x) => String(x));
			else if (typeof fm === "string") fmTags = [fm];
			for (const raw of [...inline, ...fmTags]) {
				const norm = normalizeTag(raw);
				if (!norm) continue;
				let set = tagToFiles.get(norm);
				if (!set) {
					set = new Set();
					tagToFiles.set(norm, set);
				}
				set.add(f);
			}
		}
		const issues: HealthIssue[] = [];
		for (const [tag, files] of tagToFiles) {
			if (files.size !== 1) continue;
			const file = [...files][0];
			if (!file) continue;
			issues.push({
				id: `unused-tag:${tag}:${file.path}`,
				category: "unused-tag",
				file,
				title: `#${tag}`,
				detail: `only in ${file.basename}`,
				tagName: tag,
			});
		}
		return issues;
	},
};
