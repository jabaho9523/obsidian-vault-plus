import { TFile } from "obsidian";

export function isMarkdown(file: TFile): boolean {
	return file.extension === "md";
}

export function isAttachment(file: TFile): boolean {
	return file.extension !== "md";
}

export function normalizeTitle(basename: string): string {
	return basename
		.toLowerCase()
		.replace(/[_\-\s]+/g, " ")
		.replace(/[^\p{L}\p{N} ]+/gu, "")
		.trim();
}

export function normalizeTag(raw: string): string {
	return String(raw).replace(/^#/, "").toLowerCase().trim();
}
