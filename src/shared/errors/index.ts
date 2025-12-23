// Error codes
import { CODES, type ErrorCode } from "@/shared/errors/codes";

export class AppError extends Error {
	constructor(
		public readonly message: string,
		public readonly statusCode: number,
		public readonly code: ErrorCode,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class ValidationError extends AppError {
	constructor(message: string, code: ErrorCode = CODES.VALIDATION_ERROR) {
		super(message, 400, code);
	}
}

export { CODES, type ErrorCode };
