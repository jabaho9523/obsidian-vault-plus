import { MarkdownView, Notice, TFile, setIcon } from "obsidian";
import { HealthIssue } from "../types";
import VaultPlusPlugin from "../main";
import { ConfirmModal } from "./confirm-modal";

const DELETABLE = new Set(["orphan", "empty", "unref-attachment"]);

export function renderIssueRow(
	container: HTMLElement,
	issue: HealthIssue,
	plugin: VaultPlusPlugin
): void {
	const row = container.createDiv({ cls: "vh-row" });

	const main = row.createDiv({ cls: "vh-row-main" });
	main.createDiv({ cls: "vh-row-title", text: issue.title });
	if (issue.detail) {
		main.createDiv({ cls: "vh-row-detail", text: issue.detail });
	}

	const actions = row.createDiv({ cls: "vh-row-actions" });

	if (issue.category === "duplicate" && issue.duplicate) {
		const openBoth = actions.createEl("button", {
			cls: "vh-action",
			attr: { "aria-label": "Open both side by side" },
		});
		setIcon(openBoth, "columns");
		openBoth.addEventListener("click", () => {
			void (async () => {
				const left = plugin.app.workspace.getLeaf("tab");
				await left.openFile(issue.file);
				const right = plugin.app.workspace.getLeaf("split");
				await right.openFile(issue.duplicate!.otherFile);
			})();
		});
	} else {
		const open = actions.createEl("button", {
			cls: "vh-action",
			attr: { "aria-label": "Open in new tab" },
		});
		setIcon(open, "external-link");
		open.addEventListener("click", () => {
			void (async () => {
				const leaf = plugin.app.workspace.getLeaf("tab");
				await leaf.openFile(issue.file);
				if (
					issue.category === "broken-link" &&
					issue.brokenLink?.line != null
				) {
					const view = leaf.view;
					if (view instanceof MarkdownView) {
						view.editor.setCursor({
							line: issue.brokenLink.line,
							ch: issue.brokenLink.col ?? 0,
						});
					}
				}
			})();
		});
	}

	if (DELETABLE.has(issue.category)) {
		const del = actions.createEl("button", {
			cls: "vh-action vh-action-danger",
			attr: { "aria-label": "Move to trash" },
		});
		setIcon(del, "trash");
		del.addEventListener("click", () => {
			const performDelete = async () => {
				try {
					await plugin.app.fileManager.trashFile(issue.file);
				} catch (e) {
					new Notice(
						`Failed to delete ${issue.file.name}: ${(e as Error).message}`
					);
					return;
				}
				plugin.orchestrator.invalidate();
				await plugin.orchestrator.scan();
			};
			if (plugin.settings.confirmDeletes) {
				new ConfirmModal(
					plugin.app,
					"Move to trash?",
					`${issue.file.path} will be moved to your Obsidian trash (per Settings → Files & links → Deleted files).`,
					performDelete
				).open();
			} else {
				void performDelete();
			}
		});
	}
}

export { TFile };
