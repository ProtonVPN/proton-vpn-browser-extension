import {WebRTCState} from './state';
import {getControlledValue} from '../tools/getControlledValue';
import ChromeSettingGetResultDetails = chrome.types.ChromeSettingGetResultDetails;

export const setWebRTCState = (state: WebRTCState) => new Promise<boolean>(resolve => {
	if (!chrome.privacy) {
		resolve(false);

		return;
	}

	if (state === WebRTCState.CLEAR) {
		chrome.privacy.network.webRTCIPHandlingPolicy.clear({}, resolve);

		return;
	}

	chrome.privacy.network.webRTCIPHandlingPolicy.set({value: state}, () => {
		chrome.privacy.network.webRTCIPHandlingPolicy.get({}, (setting?: ChromeSettingGetResultDetails) => {
			resolve(getControlledValue(setting) === state);
		});
	});
});
