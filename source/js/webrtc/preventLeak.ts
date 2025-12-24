import {storedPreventWebrtcLeak} from './storedPreventWebrtcLeak';
import {setWebRTCState} from './setWebRTCState';
import {WebRTCState} from './state';

export const preventLeak = async (protectionEnabled?: boolean) => {
	const protectedAgainstWebRtcLeak = typeof protectionEnabled === 'boolean'
		? protectionEnabled
		: (await storedPreventWebrtcLeak.getDefined({value: true})).value;
	await (protectedAgainstWebRtcLeak
		? setWebRTCState(WebRTCState.DISABLED)
		: setWebRTCState(WebRTCState.CLEAR)
	);
};
