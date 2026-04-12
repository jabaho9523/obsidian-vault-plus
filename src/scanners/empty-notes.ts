import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const emptyNotesScanner: Scanner = {
	id: "enableEmpty",
	category: "empty",
	enabled: (s) => s.enableEmpty,
	async run(ctx) {
		const issues: HealthIssue[] = [];
		for (const f of ctx.markdownFiles) {
			const cache = ctx.app.metadataCache.getFileCache(f);
			if (!cache) {
				if (f.stat.size === 0) {
					issues.push({
						id: `empty:${f.path}`,
						category: "empty",
						file: f,
						title: f.basename,
						detail: "0 bytes",
					});
				}
				continue;
			}
			const hasHeadings = (cache.headings?.length ?? 0) > 0;
			const hasLinks = (cache.links?.length ?? 0) > 0;
			const hasEmbeds = (cache.embeds?.length ?? 0) > 0;
			const nonYamlSections = (cache.sections ?? []).filter(
				(s) => s.type !== "yaml"
			);
			const smallFile = f.stat.size < ctx.settings.emptyByteThreshold;
			const looksEmpty =
				!hasHeadings &&
				!hasLinks &&
				!hasEmbeds &&
				nonYamlSections.length === 0;
			if (looksEmpty || (smallFile && !hasHeadings && !hasLinks)) {
				issues.push({
					id: `empty:${f.path}`,
					category: "empty",
					file: f,
					title: f.basename,
					detail: `${f.stat.size} bytes`,
				});
			}
		}
		return issues;
	},
};
