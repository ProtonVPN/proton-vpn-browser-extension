'use popup';
import {timeoutAfter} from '../../tools/delay';
import {getInfoFromBackground} from '../../tools/getInfoFromBackground';
import {BackgroundData} from '../../messaging/MessageType';
import {milliSeconds} from '../../tools/milliSeconds';
import {warn} from '../../log/log';
import type {
	ConnectionState,
	ErrorDump,
	ProxyServer,
} from '../../vpn/ConnectionState';
import type {ApiError} from '../../api/ApiError';

export type PopupConnectionState = {
	error?: ApiError | Error | ErrorDump;
	server?: ProxyServer;
	credsTry?: number;
	credsData?: {Username: string; Password: string};
	starting?: boolean;
	blocked?: boolean;
};

export const loadConnectionState = async (): Promise<PopupConnectionState> => {
	try {
		return await timeoutAfter(
			getInfoFromBackground(BackgroundData.STATE),
			milliSeconds.fromSeconds(5),
			'Unable to load state',
		);
	} catch (error) {
		warn(error, new Error().stack);

		return {error} as ConnectionState['data'];
	}
};
