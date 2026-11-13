'use popup';
import {handleError} from '../../tools/sentry';
import {getSortedLogicals} from '../../vpn/getLogicals';
import {getCities} from '../../vpn/getCities';
import {loadAllFeatures} from '../../vpn/features/loadAllFeatures';
import type {Session} from '../../account/Session';
import type {Logical} from '../../vpn/Logical';

const getLogicalList = async () => {
	let logicals: Logical[] = await getSortedLogicals();

	return {
		get() {
			return logicals;
		},
		setIfNotEmpty(logicalsInput: Logical[] | undefined) {
			if (logicalsInput?.length) {
				logicals = logicalsInput;
			}
		},
	};
};

export type LogicalBag = Awaited<ReturnType<typeof getLogicalList>>;

export const getLogicalsCitiesAndFeatures = (session: Partial<Session>) =>
	Promise.all([
		getLogicalList(),
		getCities(session.uid).catch((error) => {
			handleError(error);

			return {};
		}),
		loadAllFeatures(),
	]);
