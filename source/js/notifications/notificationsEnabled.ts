import {storage} from '../tools/storage';

export const storedNotificationsEnabled = storage.item<{value: boolean}>('notifications-enabled');
