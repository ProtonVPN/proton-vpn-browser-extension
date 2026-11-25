import {dedupe} from '../tools/dedupe';
import {getLastChoices} from './lastChoice';
import {getLookupIds} from './lookups';
import type {LogicalServersCache} from './logicalServers';
import {fetchLogicals} from './fetchLogicals';
import {RequestPriority} from '../api/RequestPriority';

// It's pointless to include more as URL is truncated
const maximumIncludedIds = 30;

export const fetchLogicalsWithIncludedIds = async (
	cache?: LogicalServersCache,
	priority = RequestPriority.NORMAL,
) =>
	await fetchLogicals(
		cache,
		dedupe(
			[
				...(await getLastChoices()).map((choice) => choice.logicalId),
				...(await getLookupIds()),
			].filter((v) => typeof v !== 'undefined'),
		).slice(0, maximumIncludedIds),
		priority,
	);
