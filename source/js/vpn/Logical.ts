import { Server } from './Server';

export interface Logical {
    ID: string | number;
	City?: string | null;
	Domain: string;
	EntryCountry: string;
	EntryCountryName?: string;
	ExitCountry: string;
	HostCountry: string;
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
