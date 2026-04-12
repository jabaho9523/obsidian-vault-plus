/**
 * Levenshtein edit distance with an upper bound for early exit.
 * Returns a value > max when the true distance exceeds max.
 */
export function levenshtein(a: string, b: string, max: number): number {
	if (a === b) return 0;
	if (Math.abs(a.length - b.length) > max) return max + 1;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	let prev: number[] = new Array<number>(b.length + 1);
	let curr: number[] = new Array<number>(b.length + 1);
	for (let j = 0; j <= b.length; j++) prev[j] = j;

	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		let rowMin = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			const left = curr[j - 1] ?? 0;
			const up = prev[j] ?? 0;
			const diag = prev[j - 1] ?? 0;
			const v = Math.min(left + 1, up + 1, diag + cost);
			curr[j] = v;
			if (v < rowMin) rowMin = v;
		}
		if (rowMin > max) return max + 1;
		const tmp = prev;
		prev = curr;
		curr = tmp;
	}
	return prev[b.length] ?? 0;
}
