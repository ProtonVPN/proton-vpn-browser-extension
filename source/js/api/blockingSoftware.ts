import {incompatibleSoftware} from '../config';
import {c} from '../tools/translate';
import {handleError} from '../tools/sentry';

const startLikeHtml = (text: string) => /^\s*</.test(text);

const guessBlockerFromHtml = (html: string) => {
	for (const blocker of incompatibleSoftware) {
		if (html.includes(blocker)) {
			return blocker;
		}
	}

	return null;
};

const getBlockingSoftwareErrorFromResponse = (text: string) => {
	const blockingSoftware = guessBlockerFromHtml(text);

	if (blockingSoftware) {
		return new Error(
			c('Info')
				.t`VPN blocked by external software: ${blockingSoftware}.\n\nSome tools, like anti-viruses or proxies, can interfere with Proton VPN. You can try disabling it to confirm.`,
		);
	}

	handleError(
		'HTML Content Received: ' +
			text
				.replace(/<script[^>]*>[\s\S]*?<\/script[^>]*>/gi, '')
				.replace(/<style[^>]*>[\s\S]*?<\/style[^>]*>/gi, '')
				.replace(/src=["']data:[^"']+["']/gi, ''),
	);

	return new Error(
		c('Info')
			.t`VPN blocked by external software.\n\nSome tools, like anti-viruses or proxies, can interfere with Proton VPN. Disable them and retry.`,
	);
};

/**
 * Read the response as text, and throw if it looks like an HTML page
 * (injected by an anti-virus, proxy or similar software) instead of API output.
 */
export const checkIfResponseWasBlocked = async (response: Response) => {
	const text = await response.text();

	if (startLikeHtml(text)) {
		throw getBlockingSoftwareErrorFromResponse(text);
	}

	return text;
};
