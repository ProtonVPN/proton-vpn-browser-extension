import {storage} from '../tools/storage';
import {StoredWebsiteExclusionList} from './WebsiteExclusion';

export const storedSplitTunneling = storage.item<StoredWebsiteExclusionList>('split-tunneling');
