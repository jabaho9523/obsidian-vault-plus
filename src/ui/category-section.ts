import { setIcon } from "obsidian";
import { HealthIssue, IssueCategory, CATEGORY_LABEL } from "../types";
import VaultPlusPlugin from "../main";
import { renderIssueRow } from "./issue-row";

const CATEGORY_ICON: Record<IssueCategory, string> = {
	orphan: "unlink",
	"broken-link": "link-2-off",
	empty: "file",
	oversized: "file-text",
	duplicate: "copy",
	"unused-tag": "tag",
	"unref-attachment": "paperclip",
};

export function renderCategorySection(
	container: HTMLElement,
	category: IssueCategory,
	issues: HealthIssue[],
	plugin: VaultPlusPlugin,
	collapsed: boolean,
	onToggle: (collapsed: boolean) => void
): void {
	const section = container.createDiv({ cls: "vh-category" });
	if (collapsed) section.addClass("vh-collapsed");

	const header = section.createDiv({ cls: "vh-category-header" });

	const chev = header.createSpan({ cls: "vh-chevron" });
	setIcon(chev, "chevron-down");

	const icon = header.createSpan({ cls: "vh-category-icon" });
	setIcon(icon, CATEGORY_ICON[category]);

	header.createSpan({
		cls: "vh-category-name",
		text: CATEGORY_LABEL[category],
	});
	header.createSpan({
		cls: "vh-category-count",
		text: String(issues.length),
	});

	const body = section.createDiv({ cls: "vh-category-body" });
	for (const issue of issues) {
		renderIssueRow(body, issue, plugin);
	}

	header.addEventListener("click", () => {
		const nowCollapsed = !section.hasClass("vh-collapsed");
		section.toggleClass("vh-collapsed", nowCollapsed);
		onToggle(nowCollapsed);
	});
}
