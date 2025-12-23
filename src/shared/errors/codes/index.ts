import { NOT_FOUND } from "@/shared/errors/codes/not-found";
import { VALIDATION } from "@/shared/errors/codes/validation";

export const CODES = {
	...VALIDATION,
	...NOT_FOUND,
	INTERNAL_ERROR: 500000,
} as const;

export type ErrorCode = (typeof CODES)[keyof typeof CODES];
