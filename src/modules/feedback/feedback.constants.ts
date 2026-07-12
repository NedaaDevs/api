export const TIER = {
	BASIC: "basic",
	ATTESTED: "attested",
} as const;
export type Tier = (typeof TIER)[keyof typeof TIER];

export const STATUS = {
	DRAFT: "DRAFT",
	SUBMITTED: "SUBMITTED",
} as const;
export type ReportStatus = (typeof STATUS)[keyof typeof STATUS];

export const KIND = {
	LOGS: "logs",
	IMAGE: "image",
	VIDEO: "video",
} as const;
export type AttachmentKindValue = (typeof KIND)[keyof typeof KIND];

export const REPORT_TYPE = {
	CRASH: "crash",
	BUG: "bug",
	FEATURE: "feature",
	OTHER: "other",
} as const;
export type ReportType = (typeof REPORT_TYPE)[keyof typeof REPORT_TYPE];

const MB = 1024 * 1024;

export const MIME_BY_KIND: Record<AttachmentKindValue, string[]> = {
	[KIND.LOGS]: ["text/plain"],
	[KIND.IMAGE]: ["image/jpeg", "image/png", "image/heic", "image/webp"],
	[KIND.VIDEO]: ["video/mp4", "video/quicktime"],
};

export const SIZE_CAP = {
	LOGS: 6 * MB,
	IMAGE_BASIC: 5 * MB,
	IMAGE_ATTESTED: 10 * MB,
	VIDEO: 100 * MB,
} as const;
