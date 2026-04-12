import { Notice, Plugin, WorkspaceLeaf, debounce } from "obsidian";
import {
	DEFAULT_SETTINGS,
	VaultPlusSettingTab,
	VaultPlusSettings,
} from "./settings";
import { VIEW_TYPE_VAULT_PLUS, RIBBON_ICON, PLUGIN_NAME } from "./constants";
import { ScanOrchestrator } from "./scan/orchestrator";
import { VaultPlusView } from "./ui/dashboard-view";
import { totalIssues } from "./types";

export default class VaultPlusPlugin extends Plugin {
	settings!: VaultPlusSettings;
	orchestrator!: ScanOrchestrator;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.orchestrator = new ScanOrchestrator(this.app, () => this.settings);

		this.registerView(
			VIEW_TYPE_VAULT_PLUS,
			(leaf: WorkspaceLeaf) => new VaultPlusView(leaf, this)
		);

		this.addRibbonIcon(RIBBON_ICON, `Open ${PLUGIN_NAME} dashboard`, () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-dashboard",
			name: "Open dashboard",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "run-full-scan",
			name: "Run full vault scan now",
			callback: async () => {
				this.orchestrator.invalidate();
				const res = await this.orchestrator.scan();
				new Notice(
					`${PLUGIN_NAME}: ${totalIssues(res)} issues found`
				);
			},
		});

		const debouncedRescan = debounce(
			() => {
				void this.orchestrator
					.scan()
					.catch((e) =>
						console.warn("[Vault Plus] rescan failed", e)
					);
			},
			1500,
			true
		);

		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				if (!this.settings.autoRescanOnChange) return;
				this.orchestrator.invalidate();
				if (
					this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULT_PLUS)
						.length > 0
				) {
					debouncedRescan();
				}
			})
		);

		this.addSettingTab(new VaultPlusSettingTab(this.app, this));

		if (this.settings.openDashboardOnStart) {
			this.app.workspace.onLayoutReady(() => {
				void this.activateView();
			});
		}
	}

	onunload(): void {
		this.orchestrator?.events.clear();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<VaultPlusSettings>
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_VAULT_PLUS);
		if (existing.length > 0) {
			await workspace.revealLeaf(existing[0]!);
			return;
		}
		const leaf =
			workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
		await leaf.setViewState({
			type: VIEW_TYPE_VAULT_PLUS,
			active: true,
		});
		await workspace.revealLeaf(leaf);
	}
}
