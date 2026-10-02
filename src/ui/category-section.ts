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

const PAGE_SIZE = 100;

export function renderCategorySection(
	container: HTMLElement,
	category: IssueCategory,
	issues: HealthIssue[],
	note: string | undefined,
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

	// Rows are built on first expand and capped per batch: a pathological
	// scan result (hundreds of thousands of issues) must not become that
	// many DOM nodes.
	let built = false;
	const buildBody = () => {
		built = true;
		const body = section.createDiv({ cls: "vh-category-body" });
		if (note) body.createDiv({ cls: "vh-category-note", text: note });
		const more = body.createEl("button", { cls: "vh-show-more" });
		let shown = 0;
		const showNext = () => {
			more.detach();
			const end = Math.min(shown + PAGE_SIZE, issues.length);
			for (; shown < end; shown++) {
				renderIssueRow(body, issues[shown]!, plugin);
			}
			const remaining = issues.length - shown;
			if (remaining > 0) {
				more.setText(
					`Show ${Math.min(PAGE_SIZE, remaining)} more (${remaining} remaining)`
				);
				body.appendChild(more);
			}
		};
		more.addEventListener("click", showNext);
		showNext();
	};
	if (!collapsed) buildBody();

	header.addEventListener("click", () => {
		const nowCollapsed = !section.hasClass("vh-collapsed");
		section.toggleClass("vh-collapsed", nowCollapsed);
		if (!nowCollapsed && !built) buildBody();
		onToggle(nowCollapsed);
	});
}
