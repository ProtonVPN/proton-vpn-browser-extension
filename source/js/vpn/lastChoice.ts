import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {Feature} from './Feature';
import type {Logical} from './Logical';

export type Choice = {
	connected: boolean;
	pick?: 'fastest' | 'random' | 'closest';
	entryCountry?: Logical['EntryCountry'];
	exitCountry?: Logical['ExitCountry'];
	city?: Logical['City']; // not translated
	logicalId?: Logical['ID'];
	requiredFeatures?: Logical['Features'];
	excludedFeatures?: Logical['Features'];
	tier?: Logical['Tier'];
	filter?: 'other';
};

type ChoiceCacheItem = CacheWrappedValue<Choice>;

const lastChoice = storage.item<ChoiceCacheItem>('last-choice', Storage.LOCAL);

export const forgetLastChoice = () => triggerPromise(lastChoice.remove());

export const setLastChoice = (choice: Choice): void => {
	triggerPromise(lastChoice.setValue(choice));
};

const getLastChoiceItem = () => lastChoice.get();

export const getLastChoice = async (): Promise<Choice> => {
	return (await getLastChoiceItem())?.value || {connected: false};
};

export const getLogicalsFilteredByChoice = (
	logicals: Logical[],
	choice: Choice,
	getById?: (id: Logical['ID']) => Logical[],
) => choice.logicalId
	? (getById
		? getById(choice.logicalId)
		: logicals.filter(logicial => logicial.ID === choice.logicalId)
	)
	: logicals.filter(logicial => {
		if ((logicial.Features & (Feature.TOR | Feature.RESTRICTED | Feature.PARTNER)) !== 0) {
			return false;
		}

		if (choice.filter === 'other' && (
			(logicial.Features & Feature.TOR) !== 0 ||
			logicial.Tier > 0 ||
			logicial.City
		)) {
			return false;
		}

		if (typeof choice.tier === 'number' && logicial.Tier !== choice.tier) {
			return false;
		}

		if (choice.excludedFeatures && (logicial.Features & choice.excludedFeatures) !== 0) {
			return false;
		}

		if (choice.requiredFeatures && (logicial.Features & choice.requiredFeatures) === 0) {
			return false;
		}

		if (choice.exitCountry && logicial.ExitCountry !== choice.exitCountry) {
			return false;
		}

		if (choice.entryCountry && logicial.EntryCountry !== choice.entryCountry) {
			return false;
		}

		if (choice.city && logicial.City !== choice.city) {
			return false;
		}

		return true;
	});
