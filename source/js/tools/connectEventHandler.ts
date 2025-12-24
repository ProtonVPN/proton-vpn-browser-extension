import type {Logical} from '../vpn/Logical';
import {StateChange} from '../messaging/MessageType';
import {Event, EventOutcome, getFeatureNames, MeasurementGroup, recordEvent} from './telemetry';
import type {ProxyServer} from '../vpn/ConnectionState';

export const connectEventHandler = {
	connecting: undefined as Logical|undefined,
	connected: undefined as Logical|undefined,
	state: undefined as StateChange|undefined,
	connect(logical: Logical): void {
		if (logical === this.connected || logical === this.connecting) {
			return;
		}

		this.state = StateChange.CONNECTING;
		this.connecting = logical;
	},
	finishConnection(connected: boolean): void {
		if (!this.connecting) {
			return;
		}

		this.connected = this.connecting;
		this.connecting = undefined;
		recordEvent(MeasurementGroup.CONNECTION, Event.VPN_CONNECTION, {
			outcome: connected ? EventOutcome.SUCCESS : EventOutcome.FAILURE,
		}, this.connected);
	},
	disconnect(previousLogical?: Logical, previousServer?: ProxyServer): void {
		this.state = StateChange.DISCONNECT;
		this.connected = undefined;

		if (this.connecting) {
			recordEvent(MeasurementGroup.CONNECTION, Event.VPN_CONNECTION, {outcome: EventOutcome.ABORTED}, this.connecting);
			this.connecting = undefined;

			return;
		}

		recordEvent(MeasurementGroup.CONNECTION, Event.VPN_DISCONNECTION, {
			outcome: EventOutcome.SUCCESS,
			...(previousServer ? {
				vpn_country: previousServer.exitCountry,
				server: previousServer.name,
				...(previousLogical ? {
					server_features: getFeatureNames(previousLogical.Tier, previousLogical.Features),
				} : {}),
			} : {}),
		});
	},
};
