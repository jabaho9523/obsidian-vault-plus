import { HealthIssue } from "../types";
import { Scanner } from "./types";
import { levenshtein } from "../scan/levenshtein";
import { normalizeTitle } from "../util/files";

const MAX_PAIRS = 500;
const MIN_TITLE_LENGTH = 5;
const YIELD_EVERY = 2000;

// Date-named and numbered notes (daily/weekly notes, numbered series)
// differ by a digit or two by design; comparing them floods the results.
function isMostlyDigits(normalized: string): boolean {
	const compact = normalized.replace(/ /g, "");
	const digits = compact.replace(/\D/g, "").length;
	return digits * 2 >= compact.length;
}

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
		// only compare plausibly-similar pairs. Titles shorter than
		// MIN_TITLE_LENGTH are skipped: any pair containing one is too
		// short to call a duplicate.
		const buckets = new Map<string, number[]>();
		for (let i = 0; i < normalized.length; i++) {
			const n = normalized[i] ?? "";
			if (n.length < MIN_TITLE_LENGTH || isMostlyDigits(n)) continue;
			const key = n.slice(0, 2);
			let arr = buckets.get(key);
			if (!arr) {
				arr = [];
				buckets.set(key, arr);
			}
			arr.push(i);
		}

		const seenPairs = new Set<string>();
		let comparisons = 0;
		for (const idxs of buckets.values()) {
			for (let a = 0; a < idxs.length; a++) {
				for (let b = a + 1; b < idxs.length; b++) {
					if (++comparisons % YIELD_EVERY === 0) {
						await new Promise((r) => window.activeWindow.setTimeout(r, 0));
					}
					const i = idxs[a]!;
					const j = idxs[b]!;
					const ni = normalized[i] ?? "";
					const nj = normalized[j] ?? "";
					const dist = ni === nj ? 0 : levenshtein(ni, nj, max);
					if (dist <= max) {
						const fi = files[i]!;
						const fj = files[j]!;
						const pairKey =
							fi.path < fj.path
								? `${fi.path}|${fj.path}`
								: `${fj.path}|${fi.path}`;
						if (seenPairs.has(pairKey)) continue;
						if (issues.length >= MAX_PAIRS) {
							return {
								issues,
								note: `Showing the first ${MAX_PAIRS} matches — lower the edit distance to narrow results.`,
							};
						}
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
