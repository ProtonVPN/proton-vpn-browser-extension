import {WebRTCState} from './state';
import {getControlledValue} from '../tools/getControlledValue';
import ChromeSettingGetResult = chrome.types.ChromeSettingGetResult;

export const setWebRTCState = (state: WebRTCState) => new Promise<boolean>(resolve => {
	if (!chrome.privacy) {
		resolve(false);

		return;
	}

	if (state === WebRTCState.CLEAR) {
		chrome.privacy.network.webRTCIPHandlingPolicy.clear({}, () => {
			resolve(true);
		});

		return;
	}

	chrome.privacy.network.webRTCIPHandlingPolicy.set({value: state}, () => {
		chrome.privacy.network.webRTCIPHandlingPolicy.get({}, (setting?: ChromeSettingGetResult<any>) => {
			resolve(getControlledValue(setting) === state);
		});
	});
});
