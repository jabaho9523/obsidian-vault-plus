import { TFile } from "obsidian";
import { HealthIssue } from "../types";
import { Scanner, ScanContext } from "./types";

export const unrefAttachmentsScanner: Scanner = {
	id: "enableUnrefAttachments",
	category: "unref-attachment",
	enabled: (s) => s.enableUnrefAttachments,
	async run(ctx) {
		const referenced = new Set<string>();

		// 1. Markdown-resolved links (Obsidian's own link graph).
		for (const targets of Object.values(ctx.resolvedLinks)) {
			for (const target of Object.keys(targets)) {
				referenced.add(target);
			}
		}

		// 2. Attachments referenced from note frontmatter. Fields like
		//    `banner:`, `cover:`, `image:` (used by banner/cover plugins) are
		//    NOT part of resolvedLinks, so without this an attachment used only
		//    as a banner would look unreferenced and be offered for trash.
		for (const f of ctx.markdownFiles) {
			const fm = ctx.app.metadataCache.getFileCache(f)?.frontmatter;
			if (!fm) continue;
			for (const value of collectStringValues(fm)) {
				if (!looksLikeRef(value)) continue;
				const dest = ctx.app.metadataCache.getFirstLinkpathDest(
					toLinkpath(value),
					f.path
				);
				if (dest) referenced.add(dest.path);
			}
		}

		// 3. Attachments referenced from .canvas files. Canvas nodes are not
		//    covered by resolvedLinks either, so a canvas-only image would
		//    otherwise be flagged unreferenced.
		for (const f of ctx.allFiles) {
			if (f.extension !== "canvas") continue;
			let raw: string;
			try {
				raw = await ctx.app.vault.cachedRead(f);
			} catch {
				continue;
			}
			for (const p of canvasReferencedPaths(raw, ctx, f.path)) {
				referenced.add(p);
			}
		}

		const issues: HealthIssue[] = [];
		for (const f of ctx.allFiles) {
			// Notes and canvases are documents, not attachments. A canvas is
			// never "linked" the way an attachment is, so flagging it as an
			// unreferenced attachment (and offering trash) was a false positive.
			if (f.extension === "md" || f.extension === "canvas") continue;
			if (referenced.has(f.path)) continue;
			issues.push({
				id: `unref-attachment:${f.path}`,
				category: "unref-attachment",
				file: f,
				title: f.name,
				detail: f.parent?.path ?? "",
			});
		}
		return issues;
	},
};

const EXT_RE = /\.[a-z0-9]{1,8}$/i;

function looksLikeRef(value: string): boolean {
	return value.includes("[[") || EXT_RE.test(toLinkpath(value));
}

function toLinkpath(value: string): string {
	const m = value.match(/^!?\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
	const inner = m?.[1];
	return (inner ?? value).trim();
}

function collectStringValues(fm: unknown): string[] {
	const out: string[] = [];
	const walk = (v: unknown): void => {
		if (typeof v === "string") out.push(v);
		else if (Array.isArray(v)) for (const item of v) walk(item);
		else if (v && typeof v === "object")
			for (const item of Object.values(v as Record<string, unknown>))
				walk(item);
	};
	walk(fm);
	return out;
}

function canvasReferencedPaths(
	raw: string,
	ctx: ScanContext,
	sourcePath: string
): string[] {
	const out: string[] = [];
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return out;
	}
	const nodes = (data as { nodes?: unknown }).nodes;
	if (!Array.isArray(nodes)) return out;
	for (const n of nodes) {
		if (!n || typeof n !== "object") continue;
		const node = n as { type?: unknown; file?: unknown; text?: unknown };
		if (node.type === "file" && typeof node.file === "string") {
			const dest = ctx.app.vault.getAbstractFileByPath(node.file);
			if (dest instanceof TFile) out.push(dest.path);
		} else if (node.type === "text" && typeof node.text === "string") {
			for (const lp of extractLinkpaths(node.text)) {
				const dest = ctx.app.metadataCache.getFirstLinkpathDest(
					lp,
					sourcePath
				);
				if (dest) out.push(dest.path);
			}
		}
	}
	return out;
}

function extractLinkpaths(text: string): string[] {
	const out: string[] = [];
	// Wikilinks / embeds: [[path]] or ![[path]]
	const wiki = /!?\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
	// Markdown links / embeds: ](path)
	const md = /\]\(([^)]+)\)/g;
	let m: RegExpExecArray | null;
	while ((m = wiki.exec(text)) !== null) {
		const g = m[1];
		if (g) out.push(g.trim());
	}
	while ((m = md.exec(text)) !== null) {
		const g = m[1];
		if (!g) continue;
		const raw = g.trim();
		if (/^[a-z]+:\/\//i.test(raw)) continue; // external URL
		let dec = raw;
		try {
			dec = decodeURI(raw);
		} catch {
			/* keep raw */
		}
		out.push(dec);
	}
	return out;
}
