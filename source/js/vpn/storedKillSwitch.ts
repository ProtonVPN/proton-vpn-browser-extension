import {storage} from '../tools/storage';

export const storedKillSwitch = storage.item<{value: boolean}>('kill-switch');
