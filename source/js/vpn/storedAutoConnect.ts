import {storage} from '../tools/storage';

export const storedAutoConnect = storage.item<{value: boolean}>('auto-connect');
