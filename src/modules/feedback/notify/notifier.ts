export interface ReportSummary {
	id: string;
	type: string;
	area: string | null;
	tier: string;
	attested: boolean;
	appVersion: string;
	platform: string;
	message: string | null;
	attachments: { kind: string; sizeBytes: number; s3Key: string }[];
	contact: string | null;
}

export interface Notifier {
	send(summary: ReportSummary): Promise<void>;
}

export interface NotifierConfig {
	botToken: string;
	chatId: string;
}

const TELEGRAM_API = "https://api.telegram.org";
const MESSAGE_MAX = 500;

const truncate = (value: string, max: number): string =>
	value.length > max ? `${value.slice(0, max)}…` : value;

const formatSummary = (s: ReportSummary): string => {
	const lines = [
		`New feedback: ${s.type}${s.area ? ` / ${s.area}` : ""}`,
		`id: ${s.id}`,
		`tier: ${s.tier}${s.attested ? " (attested)" : ""}`,
		`app: ${s.appVersion} · ${s.platform}`,
	];
	if (s.message) lines.push(`message: ${truncate(s.message, MESSAGE_MAX)}`);
	if (s.contact) lines.push(`contact: ${s.contact}`);
	if (s.attachments.length > 0) {
		const items = s.attachments
			.map(
				(a) => `  • ${a.kind} ${Math.round(a.sizeBytes / 1024)}KB — ${a.s3Key}`,
			)
			.join("\n");
		lines.push(`attachments:\n${items}`);
	}
	return lines.join("\n");
};

export const createNotifier = (cfg: NotifierConfig | null): Notifier => {
	if (!cfg) {
		return {
			send: (summary) => {
				console.log(
					"[feedback] notifier not configured, summary:\n",
					formatSummary(summary),
				);
				return Promise.resolve();
			},
		};
	}

	return {
		send: async (summary) => {
			const res = await fetch(
				`${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chat_id: cfg.chatId,
						text: formatSummary(summary),
					}),
				},
			);
			if (!res.ok) {
				const body = await res.text().catch(() => "");
				throw new Error(`telegram sendMessage failed: ${res.status} ${body}`);
			}
			const data = (await res.json()) as { ok?: boolean; description?: string };
			if (!data.ok) {
				throw new Error(
					`telegram sendMessage not ok: ${data.description ?? "unknown"}`,
				);
			}
		},
	};
};
