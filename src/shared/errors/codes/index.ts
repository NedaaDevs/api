import { AUTH } from "@/shared/errors/codes/auth";
import { FEEDBACK } from "@/shared/errors/codes/feedback";
import { NOT_FOUND } from "@/shared/errors/codes/not-found";
import { PROVIDER } from "@/shared/errors/codes/provider";
import { VALIDATION } from "@/shared/errors/codes/validation";

export const CODES = {
	...AUTH,
	...VALIDATION,
	...PROVIDER,
	...NOT_FOUND,
	...FEEDBACK,
	RATE_LIMITED: 429000,
	INTERNAL_ERROR: 500000,
} as const;

export type ErrorCode = (typeof CODES)[keyof typeof CODES];
