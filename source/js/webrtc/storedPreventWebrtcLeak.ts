import {storage} from '../tools/storage';

export const storedPreventWebrtcLeak = storage.item<{value: boolean}>('prevent-webrtc-leak');
