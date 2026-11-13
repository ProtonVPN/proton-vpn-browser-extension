'use popup';
type Asset = {
	URL: string;
	Type?: string;
	Width?: number;
	Height?: number;
	Ratio?: number;
	URLLight?: string;
};

const filterByOrientation = (
	sources: Asset[],
	orientation: 'vertical' | 'horizontal',
	containerWidth?: number,
	containerHeight?: number,
): Asset[] => {
	return sources.filter(({Width, Height, URLLight, URL}) => {
		if (!Width || !Height || !(URLLight || URL)) {
			return false;
		}

		// If container dimensions provided, check if asset fits
		if (containerWidth !== undefined && containerHeight !== undefined) {
			const devicePixelRatio = window.devicePixelRatio || 1;
			if (
				devicePixelRatio * Width <= containerWidth ||
				devicePixelRatio * Height <= containerHeight
			) {
				return false;
			}
		}

		return orientation === 'vertical' ? Width < Height : Width > Height;
	});
};

/*
 * Returns the largest asset available that matches the given orientation.
 * */
export const selectLargestAsset = (
	sources: Asset[] | undefined,
	orientation: 'vertical' | 'horizontal',
) => {
	if (!sources || !sources.length) {
		return;
	}

	const filtered = filterByOrientation(sources, orientation);
	return filtered.sort((a, b) => {
		return orientation === 'vertical'
			? (b.Height || 0) - (a.Height || 0)
			: (b.Width || 0) - (a.Width || 0);
	})[0];
};

/*
 * Returns the smallest asset available that fits with the given dimensions and orientation.
 * */
export const selectBestAsset = (
	sources: Asset[] | undefined,
	width: number,
	height: number,
	orientation: 'vertical' | 'horizontal',
) => {
	if (!sources || !sources.length) {
		return;
	}

	const filtered = filterByOrientation(sources, orientation, width, height);
	const bestAsset = filtered.sort((a, b) => {
		return orientation === 'vertical'
			? (a.Height || 0) - (b.Height || 0)
			: (a.Width || 0) - (b.Width || 0);
	})[0];

	return bestAsset ?? selectLargestAsset(sources, orientation);
};
