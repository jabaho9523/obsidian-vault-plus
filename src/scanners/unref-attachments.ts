import { HealthIssue } from "../types";
import { Scanner } from "./types";

export const unrefAttachmentsScanner: Scanner = {
	id: "enableUnrefAttachments",
	category: "unref-attachment",
	enabled: (s) => s.enableUnrefAttachments,
	run(ctx) {
		const referenced = new Set<string>();
		for (const targets of Object.values(ctx.resolvedLinks)) {
			for (const target of Object.keys(targets)) {
				referenced.add(target);
			}
		}
		const issues: HealthIssue[] = [];
		for (const f of ctx.allFiles) {
			if (f.extension === "md") continue;
			if (referenced.has(f.path)) continue;
			issues.push({
				id: `unref-attachment:${f.path}`,
				category: "unref-attachment",
				file: f,
				title: f.name,
				detail: f.parent?.path ?? "",
			});
		}
		return issues;
	},
};
