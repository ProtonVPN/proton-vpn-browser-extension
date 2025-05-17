import {triggerPromise} from './triggerPromise';
import {CacheWrappedValue, storage} from './storage';

const browserTypeStorage = storage.item<CacheWrappedValue<string>>('browser-type');

enum ChromiumType {
	BRAVE = 'brave',
	VIVALDI = 'vivaldi',
}

const hasKey = (value: object|null, key: string): boolean => (key in (value || {}));

/**
 * Used for statistical analyze of browser specific compatibility.
 */
export const getBrowserSubType = async (): Promise<string> => {
	if (typeof navigator === 'object' && hasKey(navigator, ChromiumType.BRAVE)) {
		triggerPromise(browserTypeStorage.setValue(ChromiumType.BRAVE));

		return ChromiumType.BRAVE;
	}

	const cachedValue = await browserTypeStorage.get();

	if (typeof cachedValue !== 'undefined') {
		return cachedValue.value;
	}

	if (typeof window === 'object' && hasKey(window, ChromiumType.VIVALDI)) {
		triggerPromise(browserTypeStorage.setValue(ChromiumType.VIVALDI));

		return ChromiumType.VIVALDI;
	}

	return ''; // Trust user agent
};
