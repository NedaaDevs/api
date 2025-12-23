import { Elysia } from "elysia";
import { AppError, CODES } from "@/shared/errors";

export const errorHandler = new Elysia({
	name: "errorHandler",
}).onError({ as: "global" }, ({ error, code, set }) => {
	// Override Elysia 404
	if (code === "NOT_FOUND") {
		set.status = 404;
		return {
			error: "Route Not Found",
			code: CODES.ROUTE_NOT_FOUND,
		};
	}

	// Validation
	if (code === "VALIDATION") {
		// Let Elysia handle it
		return;
	}

	// AppError
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
