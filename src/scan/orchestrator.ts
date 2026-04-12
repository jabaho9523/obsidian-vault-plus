import { App } from "obsidian";
import {
	ScanResults,
	emptyIssuesByCategory,
} from "../types";
import { Scanner } from "../scanners/types";
import { VaultPlusSettings } from "../settings";
import { buildScanContext } from "./scan-context";
import { TypedEventBus } from "../util/events";

import { orphanNotesScanner } from "../scanners/orphan-notes";
import { brokenLinksScanner } from "../scanners/broken-links";
import { emptyNotesScanner } from "../scanners/empty-notes";
import { oversizedNotesScanner } from "../scanners/oversized-notes";
import { fuzzyDuplicatesScanner } from "../scanners/fuzzy-duplicates";
import { unusedTagsScanner } from "../scanners/unused-tags";
import { unrefAttachmentsScanner } from "../scanners/unref-attachments";

export type ScanEvents = {
	"scan:started": void;
	"scan:completed": ScanResults;
	"scan:error": Error;
};

export class ScanOrchestrator {
	readonly events = new TypedEventBus<ScanEvents>();
	private results: ScanResults | null = null;
	private running = false;
	private readonly scanners: Scanner[];

	constructor(
		private app: App,
		private getSettings: () => VaultPlusSettings
	) {
		this.scanners = [
			orphanNotesScanner,
			brokenLinksScanner,
			emptyNotesScanner,
			oversizedNotesScanner,
			fuzzyDuplicatesScanner,
			unusedTagsScanner,
			unrefAttachmentsScanner,
		];
	}

	getResults(): ScanResults | null {
		return this.results;
	}

	isRunning(): boolean {
		return this.running;
	}

	invalidate(): void {
		this.results = null;
	}

	async scan(): Promise<ScanResults> {
		if (this.running && this.results) return this.results;
		this.running = true;
		this.events.emit("scan:started", undefined);
		const startedAt = Date.now();
		const settings = this.getSettings();
		const ctx = buildScanContext(this.app, settings);
		const issuesByCategory = emptyIssuesByCategory();

		try {
			for (const s of this.scanners) {
				if (!s.enabled(settings)) continue;
				try {
					issuesByCategory[s.category] = await s.run(ctx);
				} catch (e) {
					console.warn(`[Vault Plus] scanner ${s.id} failed`, e);
					issuesByCategory[s.category] = [];
				}
				await new Promise((r) => setTimeout(r, 0));
			}
			const results: ScanResults = {
				issuesByCategory,
				startedAt,
				finishedAt: Date.now(),
				fileCount: ctx.markdownFiles.length,
			};
			this.results = results;
			this.events.emit("scan:completed", results);
			return results;
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			this.events.emit("scan:error", err);
			throw err;
		} finally {
			this.running = false;
		}
	}
}
