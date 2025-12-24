import { helmet } from "elysia-helmet";

export const securityHeaders = helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
			imgSrc: ["'self'", "data:", "https:"],
			fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
			connectSrc: ["'self'"],
		},
	},
});
