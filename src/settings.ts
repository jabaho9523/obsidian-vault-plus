import { App, PluginSettingTab, Setting } from "obsidian";
import VaultPlusPlugin from "./main";

export interface VaultPlusSettings {
	// Per-scanner toggles
	enableOrphans: boolean;
	enableBrokenLinks: boolean;
	enableEmpty: boolean;
	enableOversized: boolean;
	enableDuplicates: boolean;
	enableUnusedTags: boolean;
	enableUnrefAttachments: boolean;
	// Thresholds
	orphanMode: "strict" | "no-backlinks";
	emptyByteThreshold: number;
	oversizedWordThreshold: number;
	duplicateEditDistance: number;
	// Behavior
	autoRescanOnChange: boolean;
	confirmDeletes: boolean;
	openDashboardOnStart: boolean;
	hasSeenWelcome: boolean;
}

export const DEFAULT_SETTINGS: VaultPlusSettings = {
	enableOrphans: true,
	enableBrokenLinks: true,
	enableEmpty: true,
	enableOversized: true,
	enableDuplicates: true,
	enableUnusedTags: true,
	enableUnrefAttachments: true,
	orphanMode: "strict",
	emptyByteThreshold: 40,
	oversizedWordThreshold: 3000,
	duplicateEditDistance: 2,
	autoRescanOnChange: true,
	confirmDeletes: true,
	openDashboardOnStart: false,
	hasSeenWelcome: false,
};

export class VaultPlusSettingTab extends PluginSettingTab {
	plugin: VaultPlusPlugin;

	constructor(app: App, plugin: VaultPlusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Checks").setHeading();

		this.toggle(
			"Find orphan notes",
			"Notes with no incoming (and optionally no outgoing) links.",
			"enableOrphans"
		);
		this.toggle(
			"Find broken links",
			"Wikilinks and markdown links pointing at missing targets.",
			"enableBrokenLinks"
		);
		this.toggle(
			"Find empty notes",
			"Notes with no real content, only frontmatter, or near-zero bytes.",
			"enableEmpty"
		);
		this.toggle(
			"Find oversized notes",
			"Notes larger than the word threshold below.",
			"enableOversized"
		);
		this.toggle(
			"Find fuzzy duplicates",
			"Notes with nearly identical titles. Slow on very large vaults.",
			"enableDuplicates"
		);
		this.toggle(
			"Find unused tags",
			"Tags used in only one note.",
			"enableUnusedTags"
		);
		this.toggle(
			"Find unreferenced attachments",
			"Files in the vault that no note links to.",
			"enableUnrefAttachments"
		);

		new Setting(containerEl).setName("Thresholds").setHeading();

		new Setting(containerEl)
			.setName("Orphan strictness")
			.setDesc(
				"Strict: no incoming or outgoing links. Relaxed: no incoming links."
			)
			.addDropdown((d) => {
				d.addOption("strict", "Strict — no links either way");
				d.addOption("no-backlinks", "Relaxed — no backlinks");
				d.setValue(this.plugin.settings.orphanMode);
				d.onChange(async (v) => {
					this.plugin.settings.orphanMode =
						v === "no-backlinks" ? "no-backlinks" : "strict";
					await this.saveAndInvalidate();
				});
			});

		this.numberField(
			"Empty note byte threshold",
			"Files smaller than this (in bytes) count as empty.",
			"emptyByteThreshold"
		);
		this.numberField(
			"Oversized note word threshold",
			"Notes with more words than this count as oversized.",
			"oversizedWordThreshold"
		);
		this.numberField(
			"Fuzzy duplicate edit distance",
			"Maximum Levenshtein distance between normalized titles.",
			"duplicateEditDistance"
		);

		new Setting(containerEl).setName("Behavior").setHeading();

		this.toggle(
			"Auto-rescan on vault changes",
			"Rescan automatically (debounced) while the dashboard is open.",
			"autoRescanOnChange"
		);
		this.toggle(
			"Confirm before deleting",
			"Ask before moving files to system trash.",
			"confirmDeletes"
		);
		this.toggle(
			"Open dashboard on startup",
			"Reveal the dashboard view when Obsidian starts.",
			"openDashboardOnStart"
		);
	}

	private toggle(
		name: string,
		desc: string,
		key: keyof VaultPlusSettings
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((t) =>
				t
					.setValue(this.plugin.settings[key] as boolean)
					.onChange(async (v) => {
						(this.plugin.settings as unknown as Record<string, unknown>)[
							key as string
						] = v;
						await this.saveAndInvalidate();
					})
			);
	}

	private numberField(
		name: string,
		desc: string,
		key: keyof VaultPlusSettings
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((t) => {
				const current = this.plugin.settings[key] as number;
				t.setPlaceholder(String(DEFAULT_SETTINGS[key]));
				t.setValue(String(current));
				t.onChange(async (v) => {
					const n = parseInt(v, 10);
					const fallback = DEFAULT_SETTINGS[key] as number;
					(this.plugin.settings as unknown as Record<string, unknown>)[
						key as string
					] = Number.isFinite(n) && n > 0 ? n : fallback;
					await this.saveAndInvalidate();
				});
			});
	}

	private async saveAndInvalidate(): Promise<void> {
		await this.plugin.saveSettings();
		this.plugin.orchestrator.invalidate();
	}
}
