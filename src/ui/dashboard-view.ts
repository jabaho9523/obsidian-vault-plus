import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import VaultPlusPlugin from "../main";
import { VIEW_TYPE_VAULT_PLUS, PLUGIN_NAME } from "../constants";
import {
	ALL_CATEGORIES,
	IssueCategory,
	ScanResults,
	totalIssues,
} from "../types";
import { renderCategorySection } from "./category-section";

export class VaultPlusView extends ItemView {
	private collapsed: Partial<Record<IssueCategory, boolean>> = {};
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: VaultPlusPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_VAULT_PLUS;
	}

	getDisplayText(): string {
		return "Vault plus";
	}

	getIcon(): string {
		return "brush-cleaning";
	}

	 
	async onOpen(): Promise<void> {
		this.unsubscribe = this.plugin.orchestrator.events.on(
			"scan:completed",
			() => this.render()
		);
		this.plugin.register(() => this.unsubscribe?.());

		const startedUnsub = this.plugin.orchestrator.events.on(
			"scan:started",
			() => this.renderRunning()
		);
		this.plugin.register(() => startedUnsub());

		this.render();

		if (!this.plugin.orchestrator.getResults()) {
			void this.plugin.orchestrator
				.scan()
				.catch((e) => console.warn("[Vault Plus] scan failed", e));
		}
	}

	 
	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.contentEl.empty();
	}

	private renderRunning(): void {
		const results = this.plugin.orchestrator.getResults();
		if (results) return;
		this.contentEl.empty();
		const root = this.contentEl.createDiv({ cls: "vh-root" });
		root.createDiv({ cls: "vh-header" })
			.createEl("h2", { text: PLUGIN_NAME });
		root.createDiv({ cls: "vh-summary", text: "Scanning vault…" });
	}

	private render(): void {
		const results = this.plugin.orchestrator.getResults();
		this.contentEl.empty();
		const root = this.contentEl.createDiv({ cls: "vh-root" });

		const header = root.createDiv({ cls: "vh-header" });
		header.createEl("h2", { cls: "vh-title", text: PLUGIN_NAME });
		const headerActions = header.createDiv({ cls: "vh-header-actions" });

		const rescan = headerActions.createEl("button", {
			cls: "vh-action",
			attr: { "aria-label": "Rescan vault" },
		});
		setIcon(rescan, "refresh-cw");
		rescan.addEventListener("click", () => {
			this.plugin.orchestrator.invalidate();
			void this.plugin.orchestrator.scan();
		});

		const settingsBtn = headerActions.createEl("button", {
			cls: "vh-action",
			attr: { "aria-label": "Open settings" },
		});
		setIcon(settingsBtn, "settings");
		settingsBtn.addEventListener("click", () => {
			// Open the settings tab via the runtime setting API.
			const setting = (
				this.plugin.app as unknown as {
					setting?: {
						open: () => void;
						openTabById: (id: string) => void;
					};
				}
			).setting;
			if (setting) {
				setting.open();
				setting.openTabById(this.plugin.manifest.id);
			}
		});

		if (!results) {
			root.createDiv({
				cls: "vh-summary",
				text: "Scanning vault…",
			});
			return;
		}

		this.renderSummary(root, results);
		this.renderCategories(root, results);
	}

	private renderSummary(root: HTMLElement, results: ScanResults): void {
		const total = totalIssues(results);
		const nonEmptyCats = ALL_CATEGORIES.filter(
			(c) => results.issuesByCategory[c].length > 0
		).length;
		const durationMs = Math.max(1, results.finishedAt - results.startedAt);
		const summary =
			total === 0
				? `No issues found in ${results.fileCount} notes`
				: `${total} ${total === 1 ? "issue" : "issues"} across ${nonEmptyCats} ${nonEmptyCats === 1 ? "category" : "categories"} · scanned ${results.fileCount} notes in ${durationMs} ms`;
		root.createDiv({ cls: "vh-summary", text: summary });
	}

	private renderCategories(root: HTMLElement, results: ScanResults): void {
		const categories = root.createDiv({ cls: "vh-categories" });
		let rendered = 0;
		for (const cat of ALL_CATEGORIES) {
			const issues = results.issuesByCategory[cat];
			if (issues.length === 0) continue;
			rendered++;
			renderCategorySection(
				categories,
				cat,
				issues,
				this.plugin,
				this.collapsed[cat] === true,
				(v) => {
					this.collapsed[cat] = v;
				}
			);
		}
		if (rendered === 0) {
			root.createDiv({
				cls: "vh-empty",
				text: "Your vault is clean.",
			});
		}
	}
}
