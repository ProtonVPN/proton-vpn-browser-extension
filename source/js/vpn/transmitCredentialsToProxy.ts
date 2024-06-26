import {catchPromise} from '../tools/triggerPromise';
import {delay} from '../tools/delay';
import {milliSeconds} from '../tools/milliSeconds';
import {isSuccessfulResponse} from '../api';

const lastForbiddenResponses: Record<string, number> = {};

const nudge = async (
	host: string,
	username: string | undefined,
	password: string | undefined,
	tryNumber: number,
	pause: number,
): Promise<void> => {
	await delay(pause);

	if (Date.now() - (lastForbiddenResponses[host] || 0) < milliSeconds.fromMinutes(30)) {
		return;
	}

	try {
		const response = await fetch(`http://${host}/vpn/v1/browser/token`, {
			method: 'HEAD',
			headers: username && password ? {
				'x-pm-vpn-authorization': `${username}.${password}`,
			} : {},
		});

		if (response.status === 403) {
			lastForbiddenResponses[host] = Date.now();

			return;
		}

		if (!isSuccessfulResponse(response)) {
			throw new Error(`${response.status || ''} ${response.statusText}`.trim());
		}
	} catch (e) {
		if (tryNumber > 4) {
			throw e;
		}

		await nudge(host, username, password, tryNumber + 1, ({
			1: 500,
			2: milliSeconds.fromSeconds(2),
			3: milliSeconds.fromSeconds(6),
		})[tryNumber] || milliSeconds.fromSeconds(12));
	}
};

export const transmitCredentialsToProxy = (
	host: string,
	username: string | undefined,
	password: string | undefined,
): void => {
	catchPromise(nudge(host, username, password, 1, 300));
};
