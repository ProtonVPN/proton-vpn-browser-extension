import {storage} from '../tools/storage';

export const storedSecureCore = storage.item<{value: boolean}>('secure-core');
