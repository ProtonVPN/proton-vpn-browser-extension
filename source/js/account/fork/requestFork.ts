import {arrayToBinaryString, encodeBase64URL} from '../../encoding';
import {Storage, storage} from '../../tools/storage';
import {getFullAppVersion} from '../../api';

const actions = {
	signup: '2',
};

export type RequestForkAction = keyof typeof actions;

export const requestFork = async (host: string, action?: RequestForkAction) => {
	const state = encodeBase64URL(arrayToBinaryString(crypto.getRandomValues(new Uint8Array(32))));

	await storage.setItem(`f${state}`, {}, Storage.LOCAL);

	const params: Record<string, string> = {
		app: 'proton-vpn-browser-extension',
		appVersion: getFullAppVersion(),
		state,
		t: (action && actions[action]) || '1',
		plan: 'vpn2022',
	};

	return `${host}/authorize?${new URLSearchParams(params).toString()}`;
};
