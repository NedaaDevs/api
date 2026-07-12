import { env } from "@/config/env";
import type { NotifierConfig } from "./notify/notifier";
import type { StorageConfig } from "./storage/signer";

export interface FeedbackConfig {
	storage: StorageConfig | null;
	notifier: NotifierConfig | null;
	redisUrl: string | null;
}

export const loadFeedbackConfig = (): FeedbackConfig => {
	const storage: StorageConfig | null =
		env.FEEDBACK_S3_ENDPOINT &&
		env.FEEDBACK_S3_ACCESS_KEY_ID &&
		env.FEEDBACK_S3_SECRET_ACCESS_KEY &&
		env.FEEDBACK_S3_BUCKET_NAME
			? {
					endpoint: env.FEEDBACK_S3_ENDPOINT,
					accessKeyId: env.FEEDBACK_S3_ACCESS_KEY_ID,
					secretAccessKey: env.FEEDBACK_S3_SECRET_ACCESS_KEY,
					bucket: env.FEEDBACK_S3_BUCKET_NAME,
				}
			: null;

	const notifier: NotifierConfig | null =
		env.FEEDBACK_NOTIFICATION_BOT_TOKEN && env.TELEGRAM_CHAT_ID
			? {
					botToken: env.FEEDBACK_NOTIFICATION_BOT_TOKEN,
					chatId: env.TELEGRAM_CHAT_ID,
				}
			: null;

	return {
		storage,
		notifier,
		redisUrl: env.FEEDBACK_REDIS_URL ?? null,
	};
};
