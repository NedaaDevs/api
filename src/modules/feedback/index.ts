import { Elysia, t } from "elysia";
import { feedbackRateLimit } from "@/shared/plugins/rate-limiter";
import {
	CreateReportBody,
	CreateReportResponse,
	SubmitBody,
	SubmitResponse,
} from "./feedback.schemas";
import { getFeedbackService } from "./feedback.service";

export const feedbackModule = new Elysia({
	name: "feedbackModule",
	prefix: "/feedback-reports",
	detail: {
		tags: ["Feedback"],
	},
})
	.use(feedbackRateLimit)
	.model({
		"Feedback.CreateBody": CreateReportBody,
		"Feedback.CreateResponse": CreateReportResponse,
		"Feedback.SubmitBody": SubmitBody,
		"Feedback.SubmitResponse": SubmitResponse,
	})
	.post(
		"/",
		({ body, status }) => status(201, getFeedbackService().createDraft(body)),
		{
			body: "Feedback.CreateBody",
			response: { 201: "Feedback.CreateResponse" },
		},
	)
	.patch(
		"/:id",
		({ params, body }) =>
			getFeedbackService().submit(params.id, body.submitToken),
		{
			params: t.Object({ id: t.String() }),
			body: "Feedback.SubmitBody",
			response: "Feedback.SubmitResponse",
		},
	);
