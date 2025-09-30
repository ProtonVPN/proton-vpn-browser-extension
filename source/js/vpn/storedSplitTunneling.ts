import {storage} from '../tools/storage';
import type {StoredWebsiteExclusionList} from './WebsiteExclusion';

export const storedSplitTunneling = storage.item<StoredWebsiteExclusionList>('split-tunneling');
