import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const emptyNotesScanner: Scanner = {
	id: "enableEmpty",
	category: "empty",
	enabled: (s) => s.enableEmpty,
	run(ctx) {
		const issues: HealthIssue[] = [];
		for (const f of ctx.markdownFiles) {
			// Empty notes are delete-eligible, so never flag a note that other
			// notes link to — trashing it would silently break those links.
			if ((ctx.reverseLinks.get(f.path)?.size ?? 0) > 0) continue;

			const cache = ctx.app.metadataCache.getFileCache(f);
			if (!cache) {
				// No parseable metadata and tiny on disk → treat as empty.
				if (f.stat.size < ctx.settings.emptyByteThreshold) {
					issues.push({
						id: `empty:${f.path}`,
						category: "empty",
						file: f,
						title: f.basename,
						detail: `${f.stat.size} bytes`,
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

			// "Empty" means no body content at all — blank or frontmatter-only.
			// Real prose always produces a non-YAML section, so a short one-line
			// note is never flagged. The previous size-only branch flagged such
			// real notes as empty and is intentionally removed.
			const hasBody =
				hasHeadings ||
				hasLinks ||
				hasEmbeds ||
				nonYamlSections.length > 0;

			if (!hasBody) {
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
