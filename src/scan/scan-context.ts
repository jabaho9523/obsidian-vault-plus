import { App } from "obsidian";
import { VaultPlusSettings } from "../settings";
import { ScanContext } from "../scanners/types";

export function buildScanContext(
	app: App,
	settings: VaultPlusSettings
): ScanContext {
	const markdownFiles = app.vault.getMarkdownFiles();
	const allFiles = app.vault.getFiles();
	const resolvedLinks = app.metadataCache.resolvedLinks ?? {};
	const unresolvedLinks = app.metadataCache.unresolvedLinks ?? {};

	const reverseLinks = new Map<string, Set<string>>();
	for (const [source, targets] of Object.entries(resolvedLinks)) {
		for (const target of Object.keys(targets)) {
			let set = reverseLinks.get(target);
			if (!set) {
				set = new Set();
				reverseLinks.set(target, set);
			}
			set.add(source);
		}
	}

	return {
		app,
		settings,
		markdownFiles,
		allFiles,
		resolvedLinks,
		unresolvedLinks,
		reverseLinks,
	};
}
