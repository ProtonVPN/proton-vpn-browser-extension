import {lastChoicesMemoryLimit} from '../config';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import {triggerPromise} from '../tools/triggerPromise';
import {Feature} from './Feature';
import {Recents} from './features/Recents';
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

const lastChoices = storage.item<CacheWrappedValue<ChoiceCacheItem[]>>(
	'last-choices',
	Storage.LOCAL,
);

const lastChoice = storage.item<ChoiceCacheItem>('last-choice', Storage.LOCAL);

const choiceMatch = (a: Choice, b: Choice) =>
	a.entryCountry === b.entryCountry &&
	a.exitCountry === b.exitCountry &&
	a.city === b.city &&
	a.logicalId === b.logicalId &&
	a.requiredFeatures === b.requiredFeatures &&
	a.excludedFeatures === b.excludedFeatures &&
	a.tier === b.tier &&
	a.pick === b.pick;

export const forgetLastChoice = () => triggerPromise(lastChoice.remove());

export const forgetLastChoices = () => triggerPromise(lastChoices.remove());

const removeFirstMatchingChoice = (
	choices: ChoiceCacheItem[],
	choice: Choice,
) => {
	const similarChoiceIndex = choices.findIndex((c) =>
		choiceMatch(c.value, choice),
	);

	if (similarChoiceIndex !== -1) {
		choices.splice(similarChoiceIndex, 1);
	}
};

export const forgetChoice = (choice: Choice): void => {
	triggerPromise(
		lastChoices.transactionValue((choices) => {
			removeFirstMatchingChoice(choices, choice);

			return choices;
		}, [] as ChoiceCacheItem[]),
	);
};

export const setLastChoice = (choice: Choice): void => {
	triggerPromise(lastChoice.setValue(choice));

	if (!choice.connected) {
		return;
	}

	Recents.create().then(async (recents) => {
		const config = await recents.getConfig();

		if (!config.value) {
			return;
		}

		await lastChoices.transactionValue((choices) => {
			removeFirstMatchingChoice(choices, choice);

			while (choices.length >= lastChoicesMemoryLimit) {
				choices.shift();
			}

			choices.push({
				value: choice,
				time: Date.now(),
			});

			return choices;
		}, [] as ChoiceCacheItem[]);
	});
};

const getLastChoiceItem = () => lastChoice.get();

export const getLastChoice = async (): Promise<Choice> => {
	return (await getLastChoiceItem())?.value || {connected: false};
};

export const getLastChoices = async (): Promise<Choice[]> => {
	return (
		(await lastChoices.get())?.value
			.map((c) => c.value)
			.reverse()
			.slice(0, lastChoicesMemoryLimit) || []
	);
};

export const getLogicalsFilteredByChoice = (
	logicals: Logical[],
	choice: Choice,
	getById?: (id: Logical['ID']) => Logical[],
) =>
	choice.logicalId
		? getById
			? getById(choice.logicalId)
			: logicals.filter((logicial) => logicial.ID === choice.logicalId)
		: logicals.filter((logicial) => {
				if (
					(logicial.Features &
						(Feature.TOR | Feature.RESTRICTED | Feature.PARTNER)) !==
					0
				) {
					return false;
				}

				if (
					choice.filter === 'other' &&
					((logicial.Features & Feature.TOR) !== 0 ||
						logicial.Tier > 0 ||
						logicial.City)
				) {
					return false;
				}

				if (typeof choice.tier === 'number' && logicial.Tier !== choice.tier) {
					return false;
				}

				if (
					choice.excludedFeatures &&
					(logicial.Features & choice.excludedFeatures) !== 0
				) {
					return false;
				}

				if (
					choice.requiredFeatures &&
					(logicial.Features & choice.requiredFeatures) === 0
				) {
					return false;
				}

				if (choice.exitCountry && logicial.ExitCountry !== choice.exitCountry) {
					return false;
				}

				if (
					choice.entryCountry &&
					logicial.EntryCountry !== choice.entryCountry
				) {
					return false;
				}

				if (choice.city && logicial.City !== choice.city) {
					return false;
				}

				return true;
			});
