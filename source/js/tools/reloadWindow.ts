export const reloadWindow = () => {
	if (typeof window === 'undefined' || !window.location) {
		throw new Error('Location not controllable');
	}

	window.location.reload();
};
