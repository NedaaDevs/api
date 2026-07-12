import { S3Client } from "bun";

export interface StorageConfig {
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
}

export interface PresignPutArgs {
	key: string;
	contentType: string;
	ttlSec?: number;
}

export interface PresignedUpload {
	url: string;
	headers?: Record<string, string>;
}

const MIME_TO_EXT: Record<string, string> = {
	"text/plain": "txt",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/heic": "heic",
	"image/webp": "webp",
	"video/mp4": "mp4",
	"video/quicktime": "mov",
};

export const mimeToExt = (mime: string): string => MIME_TO_EXT[mime] ?? "bin";

const DEFAULT_TTL_SECONDS = 900;

export const createStorageSigner = (cfg: StorageConfig | null) => {
	const client = cfg
		? new S3Client({
				endpoint: cfg.endpoint,
				accessKeyId: cfg.accessKeyId,
				secretAccessKey: cfg.secretAccessKey,
				bucket: cfg.bucket,
			})
		: null;

	const isConfigured = (): boolean => client !== null;

	const buildKey = (
		reportId: string,
		attachmentId: string,
		mime: string,
	): string => `reports/${reportId}/${attachmentId}.${mimeToExt(mime)}`;

	const presignPut = ({
		key,
		contentType,
		ttlSec = DEFAULT_TTL_SECONDS,
	}: PresignPutArgs): PresignedUpload => {
		if (!client) throw new Error("storage not configured");
		const url = client.presign(key, {
			method: "PUT",
			expiresIn: ttlSec,
			type: contentType,
		});
		// Bun's presign has no content-length condition; size is enforced
		// server-side at draft time. Client must echo Content-Type on the PUT.
		return { url, headers: { "Content-Type": contentType } };
	};

	return { isConfigured, buildKey, presignPut };
};

export type StorageSigner = ReturnType<typeof createStorageSigner>;
