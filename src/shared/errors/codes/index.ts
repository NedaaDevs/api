import { VALIDATION } from "@/shared/errors/codes/validation";

export const CODES = {
	...VALIDATION,

	INTERNAL_ERROR: 500000,
} as const;

export type ErrorCode = (typeof CODES)[keyof typeof CODES];
