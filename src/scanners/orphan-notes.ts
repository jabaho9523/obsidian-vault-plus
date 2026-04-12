import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const orphanNotesScanner: Scanner = {
	id: "enableOrphans",
	category: "orphan",
	enabled: (s) => s.enableOrphans,
	run(ctx) {
		const issues: HealthIssue[] = [];
		for (const f of ctx.markdownFiles) {
			const outgoing = ctx.resolvedLinks[f.path] ?? {};
			const outCount = Object.keys(outgoing).length;
			const inCount = ctx.reverseLinks.get(f.path)?.size ?? 0;
			const isOrphan =
				ctx.settings.orphanMode === "strict"
					? inCount === 0 && outCount === 0
					: inCount === 0;
			if (isOrphan) {
				issues.push({
					id: `orphan:${f.path}`,
					category: "orphan",
					file: f,
					title: f.basename,
					detail:
						ctx.settings.orphanMode === "strict"
							? "no links"
							: "no backlinks",
				});
			}
		}
		return issues;
	},
};
