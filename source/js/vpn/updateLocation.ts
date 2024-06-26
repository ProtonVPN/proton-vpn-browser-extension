import {getLocation} from '../account/getLocation';
import {setJitterInterval} from '../tools/delay';
import {RefreshTokenError} from '../account/RefreshTokenError';
import {logOut} from '../state';
import {getLocationRefreshInterval} from '../intervals';

export const updateLocation = (): void => {
	const loadLocation = (): void => {
		getLocation().catch(error => {
			if (error instanceof RefreshTokenError || (error as RefreshTokenError).logout) {
				logOut(false);
			}
		});
	};
	const interval = getLocationRefreshInterval();
	setJitterInterval(interval, interval / 10, loadLocation);
	(navigator as any).connection?.addEventListener('change', loadLocation);
}
