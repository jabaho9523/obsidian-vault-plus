import { HealthIssue } from "../types";
import { Scanner } from "./types";
import { levenshtein } from "../scan/levenshtein";
import { normalizeTitle } from "../util/files";

export const fuzzyDuplicatesScanner: Scanner = {
	id: "enableDuplicates",
	category: "duplicate",
	enabled: (s) => s.enableDuplicates,
	async run(ctx) {
		const issues: HealthIssue[] = [];
		const files = ctx.markdownFiles;
		const normalized = files.map((f) => normalizeTitle(f.basename));
		const max = ctx.settings.duplicateEditDistance;

		// Bucket by the first 2 characters of the normalized title so we
		// only compare plausibly-similar pairs. Notes shorter than 2 chars
		// go into a shared "short" bucket.
		const buckets = new Map<string, number[]>();
		for (let i = 0; i < normalized.length; i++) {
			const n = normalized[i] ?? "";
			const key = n.length >= 2 ? n.slice(0, 2) : "__short__";
			let arr = buckets.get(key);
			if (!arr) {
				arr = [];
				buckets.set(key, arr);
			}
			arr.push(i);
		}

		const seenPairs = new Set<string>();
		for (const idxs of buckets.values()) {
			for (let a = 0; a < idxs.length; a++) {
				for (let b = a + 1; b < idxs.length; b++) {
					const i = idxs[a]!;
					const j = idxs[b]!;
					const ni = normalized[i] ?? "";
					const nj = normalized[j] ?? "";
					if (!ni || !nj) continue;
					const dist = ni === nj ? 0 : levenshtein(ni, nj, max);
					if (dist <= max) {
						const fi = files[i]!;
						const fj = files[j]!;
						const pairKey =
							fi.path < fj.path
								? `${fi.path}|${fj.path}`
								: `${fj.path}|${fi.path}`;
						if (seenPairs.has(pairKey)) continue;
						seenPairs.add(pairKey);
						issues.push({
							id: `duplicate:${pairKey}`,
							category: "duplicate",
							file: fi,
							title: fi.basename,
							detail: `≈ ${fj.basename}${dist > 0 ? ` (distance ${dist})` : ""}`,
							duplicate: { otherFile: fj, distance: dist },
						});
					}
				}
			}
		}
		return issues;
	},
};
