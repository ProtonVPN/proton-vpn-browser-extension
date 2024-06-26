import {Logical} from '../vpn/Logical';
import {getCachedLocation} from '../account/getLocation';
import {loadCachedUser} from '../account/user/loadCachedUser';
import {fetchWithUserInfo} from '../account/fetchWithUserInfo';
import {Feature} from '../vpn/Feature';
import {Choice, getLastChoice} from '../vpn/lastChoice';
import {fetchApi, jsonRequest} from '../api';
import {storage} from './storage';
import {telemetryEnabled} from '../config';

const NO_VALUE = 'n/a';

export enum Event {
	VPN_CONNECTION = 'vpn_connection',
	VPN_DISCONNECTION = 'vpn_disconnection',
}

export enum MeasurementGroup {
	CONNECTION = 'vpn.any.connection',
}

export const telemetryOptIn = storage.item<{value: boolean}>('telemetry');

export const isTelemetryFeatureEnabled = () => new Promise<boolean>(resolve => {
	resolve(telemetryEnabled);
});

export const getTelemetryOptIn = () => telemetryEnabled
	? telemetryOptIn.getDefined({value: false})
	: new Promise<{value: false}>(resolve => {
		resolve({value: false});
	});

export const getFeatureNames = (tier: number, features: number): string => [
	tier ? null : 'free',
	(features & Feature.TOR) ? 'tor' : null,
	(features & Feature.P2P) ? 'p2p' : null,
	(features & Feature.PARTNER) ? 'partnership' : null,
	(features & Feature.STREAMING) ? 'streaming' : null,
].filter(Boolean).sort().join(',');

const getVpnTrigger = (choice?: Choice) => {
	if (!choice) {
		return NO_VALUE;
	}

	if (choice.logicalId) {
		return 'server';
	}

	if (choice.city) {
		return 'city';
	}

	if (choice.exitCountry) {
		return 'country';
	}

	return 'quick';
}

export const recordEvent = (
	group: MeasurementGroup,
	event: Event,
	dimensions: Record<string, string | number> = {},
	logical?: Logical,
): void => {
	Promise.all([
		telemetryEnabled
			? telemetryOptIn.load()
			: new Promise<{value: false}>(resolve => {
				resolve({value: false});
			}),
		getCachedLocation(),
		loadCachedUser(),
		getLastChoice(),
	]).then(async ([
		{value: optIn},
		{location},
		{user},
		lastChoice,
	]) => {
		const tier = user?.VPN?.MaxTier;
		const formattedDimensions: Record<string, string> = {};
		const rawDimensions: Record<string, any> = {
			vpn_trigger: getVpnTrigger(lastChoice),
			...(logical
					? {
						vpn_country: logical.ExitCountry || null,
						server: logical.Name || null,
						server_features: getFeatureNames(logical.Tier, logical.Features),
					}
					: {}
			),
			user_country: location?.Country || null,
			isp: location?.ISP || null,
			user_tier: tier,
			...dimensions,
		};

		Object.keys(rawDimensions).forEach(dimensionName => {
			const value = rawDimensions[dimensionName];
			formattedDimensions[dimensionName] = typeof value === 'undefined' || value === null
				? NO_VALUE
				: `${value}`;
		});

		const body = {
			MeasurementGroup: group,
			Event: event,
			Values: {}, // time_to_connection, session_length
			Dimensions: formattedDimensions,
		};
		const calls = [];

		if (optIn) {
			calls.push(fetchApi('data/v1/stats', jsonRequest('POST', body)));
		}

		if (user?.VPN?.BusinessEvents) {
			calls.push(fetchWithUserInfo('vpn/v1/business/events', jsonRequest('POST', body)));
		}

		await Promise.all(calls);
	});
};
