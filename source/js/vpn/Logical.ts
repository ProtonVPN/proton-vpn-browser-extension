import type {Server} from './Server';

export interface Logical {
	ID: string | number;
	City?: string | null;
	Domain: string;
	/** e.g. JP | US */
	EntryCountry: string;
	EntryCountryName?: string;
	/** e.g. JP | US */
	ExitCountry: string;
	HostCountry: string | null;
	Features: number; // bitmap
	Location: { Lat: number, Long: number };
	Name: string;
	Region?: string | null;
	ServerIDs?: number[];
	UserIDs?: (string | number)[];
	Servers?: Server[];
	Tier: number;
	Visible: boolean | number;
	Score: number;
	SearchScore?: number;
	Load?: number;
	Translations?: {
		EntryCountryName?: string;
		City?: string|null;
	};
	Status: number;
	_up?: boolean;
}
