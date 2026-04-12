import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const oversizedNotesScanner: Scanner = {
	id: "enableOversized",
	category: "oversized",
	enabled: (s) => s.enableOversized,
	async run(ctx) {
		const issues: HealthIssue[] = [];
		const threshold = ctx.settings.oversizedWordThreshold;
		const minBytes = threshold * 4;
		for (const f of ctx.markdownFiles) {
			if (f.stat.size < minBytes) continue;
			let text: string;
			try {
				text = await ctx.app.vault.cachedRead(f);
			} catch {
				continue;
			}
			const words = text.trim().split(/\s+/).filter(Boolean).length;
			if (words >= threshold) {
				issues.push({
					id: `oversized:${f.path}`,
					category: "oversized",
					file: f,
					title: f.basename,
					detail: `${words} words`,
				});
			}
		}
		return issues;
	},
};
