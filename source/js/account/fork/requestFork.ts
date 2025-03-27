import {arrayToBinaryString, encodeBase64URL} from '../../encoding';
import {Storage, storage} from '../../tools/storage';
import {getFullAppVersion} from '../../api';

const actions = {
	signup: '2',
};

export type RequestForkAction = keyof typeof actions;

export const requestFork = async ({host, action, partnerId, independent}: {
	host: string,
	action?: RequestForkAction,
	partnerId?: string;
	independent?: boolean
}) => {
	const state = encodeBase64URL(arrayToBinaryString(crypto.getRandomValues(new Uint8Array(32))));

	const forkState: ForkState = {
		partnerId,
		independent
	}
	await storage.setItem(`f${state}`, forkState, Storage.LOCAL);

	const params: Record<string, string> = {
		app: 'proton-vpn-browser-extension',
		appVersion: getFullAppVersion(),
		state,
		t: (action && actions[action]) || '1',
		plan: 'vpn2024',
	};

	if (partnerId) {
		params['partnerId'] = partnerId;
	}

	if (independent) {
		params['independent'] = '1';
	}

	return `${host}/authorize?${new URLSearchParams(params).toString()}`;
};
