'use popup';
import type {User} from '../../account/user/User';
import type {ApiError} from '../../api/ApiError';
import type {ErrorDump, ServerSummary} from '../../vpn/ConnectionState';
import type {Logical} from '../../vpn/Logical';
import {connectEventHandler} from '../../tools/connectEventHandler';
import {pickServerInLogical} from '../../vpn/pickServerInLogical';
import {Feature} from '../../vpn/Feature';
import {sendMessageToBackground} from '../../tools/sendMessageToBackground';
import {StateChange} from '../../messaging/MessageType';
import {getSplitTunnelingConfig} from '../../vpn/getSplitTunnelingConfig';
import {recordConnectionToLookupId} from '../../vpn/lookups';
import {setReviewInfoStateOnConnectAction} from '../../vpn/reviewInfo';
import {maybeShowRatingModal} from '../modals/ratingModal';
import {getUserMaxTier} from '../../account/user/getUserMaxTier';
import type {AllFeatures} from '../../vpn/features/AllFeatures';

export const getConnectToServer = (
	rateUsModal: HTMLDialogElement | null,
	state: {
		connected: boolean;
		restarted: boolean;
	},
	getFeatures: () => AllFeatures,
	getUser: () => User | undefined,
	setError: (apiError: ApiError | Error | ErrorDump | undefined) => void,
	refreshConnectionStatus: (
		server: ServerSummary | undefined,
		connecting: boolean,
	) => void,
) => {
	return async (logical: Logical) => {
		connectEventHandler.connect(logical);

		const server = pickServerInLogical(logical);

		if (!server) {
			throw new Error(
				'Misconfigured server. Cannot find an entry for this server.',
			);
		}

		try {
			const willHaveToConnect = !state.connected;
			state.connected = true;
			refreshConnectionStatus(
				{
					id: logical.ID,
					name: logical.Name,
					exitIp: server.ExitIP,
					entryCountry: logical.EntryCountry,
					exitCountry: logical.ExitCountry,
					exitCity: logical.Translations?.City || logical.City,
					exitEnglishCity: logical.City,
					secureCore: (logical.Features & Feature.SECURE_CORE) !== 0,
				},
				willHaveToConnect,
			);
			const user = getUser();
			await sendMessageToBackground(StateChange.CONNECT, {
				server,
				logical,
				user,
				splitTunneling: getSplitTunnelingConfig(
					getUserMaxTier(user),
					getFeatures().splitTunneling.config,
				),
			});

			if (logical.ID) {
				recordConnectionToLookupId(logical.ID);
			}

			await setReviewInfoStateOnConnectAction();
			maybeShowRatingModal(rateUsModal, getUser());
		} catch (e) {
			setError(e as Error);
		}
	};
};
