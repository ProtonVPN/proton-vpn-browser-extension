/**
 * Urgency levels (RFC 9218 - Extensible Prioritization Scheme for HTTP)
 * supported by Proton API.
 *
 * The lower the value, the more urgent the request.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9218#name-urgency
 */
export enum RequestPriority {
	/**
	 * The user is actively waiting for this response
	 * (e.g. sign-in, connecting to a server, search).
	 */
	INTERACTIVE = 2,
	/**
	 * Regular request, needed for the extension to work properly.
	 */
	NORMAL = 4,
	/**
	 * Refresh of data we already have, the current data being still
	 * fresh enough to be used meanwhile.
	 */
	BACKGROUND = 5,
	/**
	 * Request that can be delayed or dropped without impacting the user
	 * (e.g. metrics, crash reports).
	 */
	OPTIONAL = 7,
}

export const priorityHeaderName = 'priority';

/**
 * Get the RFC 9218 Priority header for the given urgency level.
 */
export const getPriorityHeaders = (
	priority: RequestPriority,
): Record<string, string> => ({
	[priorityHeaderName]: `u=${priority}`,
});

/**
 * Return a copy of the given request init with the Priority header set.
 */
export const withPriority = <T extends RequestInit>(
	priority: RequestPriority,
	init?: T,
): T =>
	({
		...init,
		headers: {
			...(init?.headers as Record<string, string> | undefined),
			...getPriorityHeaders(priority),
		},
	}) as T;
