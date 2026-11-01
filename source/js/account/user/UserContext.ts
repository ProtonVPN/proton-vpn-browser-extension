import type {Coordinates} from '../../tools/Coordinates';

/**
 * Info about the user/device needed to select the correct servers.
 */
export type UserContext = {
	country: string;
	location?: Partial<Coordinates>;
	tier: number;
};
