/* c8 ignore start */

import type {Coordinates} from '../tools/Coordinates';
import type {Server} from './Server';

export interface StatusReference {
	Cost: number;
	Index: number;
	Penalty: number;
}

interface LogicalBase {
	ID: string | number;
	Domain: string;
	/** e.g. JP | US */
	EntryCountry: string;
	/** e.g. JP | US */
	ExitCountry: string;
	City?: string | null;
	State?: string | null;
	HostCountry: string | null;
	Features: number; // bitmap
	Name: string;
	GatewayName?: string | null;
	Region?: string | null;
	Servers?: Server[];
	Tier: number;
	Translations?: {
		EntryCountryName?: string;
		City?: string | null;
	};
}

interface LogicalV2 extends LogicalBase {
	EntryLocation: Coordinates;
	ExitLocation: Coordinates;
	StatusReference: StatusReference;
}

export interface LogicalLoad {
	Enabled: boolean;
	Visible: boolean;
	AutoConnectable: boolean;
	Load: number;
	ServerCapacity: number;
}

interface LogicalFrontEndProperties extends Partial<LogicalLoad> {
	EntryCountryName?: string;
	Score?: number;
	SearchScore?: number;
	_up?: boolean;
}

export interface Logical extends LogicalV2, LogicalFrontEndProperties {}

/* c8 ignore stop */
