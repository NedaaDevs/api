import { Elysia } from "elysia";
import { AppError, CODES } from "@/shared/errors";

export const errorHandler = new Elysia({
	name: "errorHandler",
}).onError({ as: "global" }, ({ error, set }) => {
	if (error instanceof AppError) {
		set.status = error.statusCode;
		return {
			error: error.message,
			code: error.code,
		};
	}

	// Error is unknown
	console.error("Unhandled error: ", error);
	set.status = 500;
	return {
		error: "Internal Server Error",
		code: CODES.INTERNAL_ERROR,
	};
});
