import {storage} from '../tools/storage';
import type {StoredWebsiteFilterList} from './WebsiteFilter';

export const storedSplitTunneling = storage.item<StoredWebsiteFilterList>('split-tunneling');
