import { AUTH } from "@/shared/errors/codes/auth";
import { NOT_FOUND } from "@/shared/errors/codes/not-found";
import { PROVIDER } from "@/shared/errors/codes/provider";
import { VALIDATION } from "@/shared/errors/codes/validation";

export const CODES = {
	...AUTH,
	...VALIDATION,
	...PROVIDER,
	...NOT_FOUND,
	INTERNAL_ERROR: 500000,
} as const;

export type ErrorCode = (typeof CODES)[keyof typeof CODES];
