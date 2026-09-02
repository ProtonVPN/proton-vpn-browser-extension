import type {LogicalLoad} from './Logical';
import {logicalServers} from './logicalServers';

/**
 * The load statuses we last got for logicals v2, indexed the way
 * `StatusReference.Index` points at them.
 *
 * Logicals v2 share one status list, so a logical fetched alone (a lookup for
 * instance) can get its load from the list the cached logicals already carry.
 */
export const getLatestCachedStatuses = async (): Promise<
	Partial<LogicalLoad>[]
> => {
	const cache = await logicalServers.get();
	const statuses: Partial<LogicalLoad>[] = [];

	cache?.value?.forEach((logical) => {
		const index = logical.StatusReference?.Index;

		if (typeof index !== 'number' || statuses[index]) {
			return;
		}

		statuses[index] = {
			Enabled: logical.Enabled,
			Visible: logical.Visible,
			AutoConnectable: logical.AutoConnectable,
			Load: logical.Load,
			ServerCapacity: logical.ServerCapacity,
		};
	});

	return statuses;
};
