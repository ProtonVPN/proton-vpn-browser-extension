import {isInBackground} from './isInBackground';

export const backgroundOnly = (name: string) => {
	if (!isInBackground()) {
		throw new Error(name + ' is background only');
	}
};
