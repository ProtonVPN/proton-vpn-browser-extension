import {triggerPromise} from './triggerPromise';
import {CacheWrappedValue, storage} from './storage';

const browserTypeStorage = storage.item<CacheWrappedValue<string>>('browser-type');

enum ChromiumType {
	BRAVE = 'brave',
	VIVALDI = 'vivaldi',
	OCULUS = 'Oculus',
}

const hasKey = (value: object|null, key: string): boolean => (key in (value || {}));

interface BrowserSubTypeNavigatorCheck {
	whenNavigator(navigator: Navigator): boolean;
}

interface BrowserSubTypeWindowCheck {
	whenWindow(window: Window): boolean;
}

type BrowserSubTypeCheck = BrowserSubTypeNavigatorCheck | BrowserSubTypeWindowCheck;

const canBeCheckedInBackgroundService = (check: BrowserSubTypeCheck): check is BrowserSubTypeNavigatorCheck => 'whenNavigator' in check;
const cannotBeCheckedInBackgroundService = (check: BrowserSubTypeCheck): check is BrowserSubTypeWindowCheck => 'whenWindow' in check;

const checks: Record<ChromiumType, BrowserSubTypeCheck> = {
	[ChromiumType.OCULUS]: {
		whenNavigator: (navigator: Navigator) => navigator.userAgent.includes('OculusBrowser'),
	},
	[ChromiumType.BRAVE]: {
		whenNavigator: (navigator: Navigator) => hasKey(navigator, ChromiumType.BRAVE),
	},
	[ChromiumType.VIVALDI]: {
		whenWindow: (window: Window) => hasKey(window, ChromiumType.VIVALDI),
	},
};

const storeAndReturn = (subType: ChromiumType) => {
	triggerPromise(browserTypeStorage.setValue(subType));

	return subType;
};

/**
 * Used for statistical analyze of browser specific compatibility.
 */
export const getBrowserSubType = async (): Promise<string> => {
	if (typeof navigator === 'object') {
		for (const subType in checks) {
			const check = checks[subType as ChromiumType];

			if (canBeCheckedInBackgroundService(check) && check.whenNavigator(navigator)) {
				return storeAndReturn(subType as ChromiumType);
			}
		}
	}

	const cachedValue = await browserTypeStorage.get();

	if (typeof cachedValue !== 'undefined') {
		return cachedValue.value;
	}

	if (typeof window === 'object') {
		for (const subType in checks) {
			const check = checks[subType as ChromiumType];

			if (cannotBeCheckedInBackgroundService(check) && check.whenWindow(window)) {
				return storeAndReturn(subType as ChromiumType);
			}
		}
	}

	return ''; // Trust user agent
};
