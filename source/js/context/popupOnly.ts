import {isInBackground} from './isInBackground';

export const popupOnly = (name: string) => {
	if (isInBackground()) {
		throw new Error(name + ' is popup only');
	}
};
