import {storedPreventWebrtcLeak} from './storedPreventWebrtcLeak';
import {setWebRTCState} from './setWebRTCState';
import {WebRTCState} from './state';

export const preventLeak = async () => {
	await ((await storedPreventWebrtcLeak.getDefined({value: true})).value
		? setWebRTCState(WebRTCState.DISABLED)
		: setWebRTCState(WebRTCState.CLEAR)
	);
};
