/** Host with "*" wildcards: letters, digits, "-", "_", "." and "*" only */
const wildcardHost = /^[a-z0-9*._-]+$/i;
/** Characters allowed in a URL path and query (RFC 3986 pchar, "/" and "?") */
const urlPath = /^[a-z0-9\-._~!$&'()*+,;=:@%/?]*$/i;

export interface ParsedFilterDomain {
	/** Value to store and to match requests against (host part in ASCII/punycode, lowercase) */
	domain: string;
	/** Value as typed by the user, only set when the host part got converted to punycode */
	originalDomain?: string;
}

/**
 * Return the hostname as the browser sees it (lowercase, IDN converted to punycode)
 * or undefined if host is not a bare host (with credentials, port, path, query or hash)
 * or not valid at all.
 */
const getHostname = (host: string): string | undefined => {
	try {
		const url = new URL(`http://${host}`);

		if (
			url.username ||
			url.password ||
			url.port ||
			url.pathname !== '/' ||
			url.search ||
			url.hash
		) {
			return undefined;
		}

		return url.hostname;
	} catch {
		return undefined;
	}
};

/**
 * Validate and normalize a split-tunneling domain typed by the user.
 *
 * The host part is normalized with new URL().hostname so that it matches what
 * the browser gives as request hostname (e.g. "Пример.рф" => "xn--e1afmkfd.xn--p1ai",
 * "Example.COM" => "example.com"). Prefixes supported by matchDomainList
 * ("//", "://", ".") and the path after the first "/" are kept untouched.
 *
 * Hosts containing "*" are not normalized, they are only accepted if made
 * of hostname characters (ASCII letters, digits, "-", "_", ".") and "*".
 * The path only accepts characters valid in a URL path or query.
 *
 * @returns undefined if the input is not a valid domain.
 */
export const parseFilterDomain = (
	input: string,
): ParsedFilterDomain | undefined => {
	const value = input.trim();

	if (value === '' || /^[a-z]+:\/\//i.test(value) || /\s/.test(value)) {
		return undefined;
	}

	const [, prefix = '', host = '', path = ''] =
		value.match(/^((?::?\/\/)?\.?)([^/]*)(.*)$/) || [];

	if (host === '' || !urlPath.test(path)) {
		return undefined;
	}

	if (host.includes('*')) {
		return wildcardHost.test(host) ? {domain: value} : undefined;
	}

	const hostname = getHostname(host);

	if (hostname === undefined) {
		return undefined;
	}

	const domain = prefix + hostname + path;

	return /(^|\.)xn--/.test(hostname) && domain !== value
		? {domain, originalDomain: value}
		: {domain};
};
