import {fetchJson} from '../api';
import {type CacheWrappedValue, Storage, storage} from '../tools/storage';
import type {Logical} from './Logical';
import {getCacheAge} from '../tools/getCacheAge';
import {getLanguage} from '../tools/translate';
import {triggerPromise} from '../tools/triggerPromise';
import {getCityTranslationMissingNamesTTL, getCityTranslationNamesTTL} from '../intervals';

export type Cities = Record<string, Record<string, string>|null>;
type CitiesCacheItem = CacheWrappedValue<Cities>;

let localCitiesCaching = {} as Record<string, CitiesCacheItem>;

const fetchCities = async (languageKey: string, cacheKey: string): Promise<Cities> => {
	const data = await fetchJson('vpn/v1/cities/names');
	const { Cities: cities }: { Cities: Cities } = data as any;

	if (cities) {
		const cacheItem = {time: Date.now(), value: cities};
		localCitiesCaching[cacheKey] = cacheItem;
		triggerPromise(storage.setItem('city-names-' + languageKey, cacheItem, Storage.LOCAL));

		return cities;
	}

	return {};
};

let lastSessionUid: string|undefined = undefined;
let lastMissingCheck = 0;

export const mergeTranslations = (logicals: Logical[], cities: Cities) => {
	const empty = (Object.keys(cities).length === 0);
	let missing = 0;

	logicals.forEach(logical => {
		if (empty || logical.Translations?.City || !logical.City) {
			return;
		}

		if (!(cities[logical.ExitCountry] || {}).hasOwnProperty(logical.City)) {
			if (logical.Tier !== 3) {
				missing++;
			}

			return;
		}

		logical.Translations = {
			City: (cities[logical.ExitCountry] as Record<string, string>)[logical.City],
			...logical.Translations,
		};
	});

	if (missing > 0) {
		const time = Date.now();

		if (time - lastMissingCheck > getCityTranslationMissingNamesTTL()) {
			lastMissingCheck = time;
			getCities(lastSessionUid, true).then(newCities => {
				mergeTranslations(logicals, newCities);
			});
		}
	}
};

const loadCitiesCacheItem = async (cacheKey: string, languageKey: string): Promise<CitiesCacheItem|undefined> => {
	if (localCitiesCaching[cacheKey]) {
		return localCitiesCaching[cacheKey];
	}

	const cacheItem = await storage.getItem<CitiesCacheItem>('city-names-' + languageKey, undefined, Storage.LOCAL);

	if (cacheItem) {
		localCitiesCaching[cacheKey] = cacheItem;
	}

	return cacheItem;
};

export const getCities = async (sessionUid?: string, forceReload = false): Promise<Cities> => {
	lastSessionUid = sessionUid;
	const languages = navigator.languages || [getLanguage()];

	if (/^en(-.*)$/.test(`${languages[0] || ''}`)) {
		// English is default, save a request
		return {};
	}

	const languageKey = languages.join('/');
	const cacheKey = (sessionUid || '') + ':' + languageKey;

	if (!forceReload) {
		const cacheItem = await loadCitiesCacheItem(cacheKey, languageKey);
		const age = getCacheAge(cacheItem);

		if (age < getCityTranslationNamesTTL()) {
			return cacheItem?.value || {};
		}
	}

	try {
		return await fetchCities(languageKey, cacheKey);
	} catch (e) {
		// Not a big deal, let's just keep them in English
		return {};
	}
};
