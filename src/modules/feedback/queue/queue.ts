import { Queue, Worker } from "bullmq";
import { createConnection } from "./connection";

const QUEUE_NAME = "feedback-notify";

export interface FeedbackQueue {
	enqueueNotify(reportId: string): Promise<void>;
	shutdown(): Promise<void>;
}

export interface FeedbackQueueOptions {
	redisUrl: string | null;
	processNotify: (reportId: string) => Promise<void>;
	concurrency?: number;
}

export const createFeedbackQueue = ({
	redisUrl,
	processNotify,
	concurrency = 2,
}: FeedbackQueueOptions): FeedbackQueue => {
	// No broker configured → best-effort inline notify. The SQLite row is the
	// durable source of truth; only the notification side effect is at risk.
	if (!redisUrl) {
		return {
			enqueueNotify: async (reportId) => {
				try {
					await processNotify(reportId);
				} catch (err) {
					console.error("[feedback] inline notify failed:", err);
				}
			},
			shutdown: () => Promise.resolve(),
		};
	}

	const producerConn = createConnection(redisUrl, { failFast: true });
	const workerConn = createConnection(redisUrl);

	const queue = new Queue(QUEUE_NAME, { connection: producerConn });
	const worker = new Worker<{ reportId: string }>(
		QUEUE_NAME,
		(job) => processNotify(job.data.reportId),
		{ connection: workerConn, concurrency },
	);
	worker.on("failed", (job, err) => {
		console.error(`[feedback] notify job ${job?.id} failed:`, err.message);
	});

	return {
		enqueueNotify: async (reportId) => {
			await queue.add(
				"notify",
				{ reportId },
				{
					// jobId = reportId dedupes duplicate/retried enqueues of the same
					// report to a single job while it is still in the queue.
					jobId: reportId,
					attempts: 5,
					backoff: { type: "exponential", delay: 1000 },
					removeOnComplete: true,
					removeOnFail: 100,
				},
			);
		},
		shutdown: async () => {
			await worker.close();
			await queue.close();
			producerConn.disconnect();
			workerConn.disconnect();
		},
	};
};
