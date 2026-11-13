'use popup';
export const configureCentralView = (area: HTMLElement) => {
	const centralView = area.querySelector<HTMLDivElement>('.central-view');

	if (centralView) {
		const minWidth = parseInt(window.getComputedStyle(centralView).minWidth);
		const maxWidth = screen.availWidth * 0.8;

		if (minWidth > maxWidth) {
			centralView.style.minWidth = Math.round(maxWidth) + 'px';
		}

		const minHeight = parseInt(window.getComputedStyle(centralView).minHeight);
		const maxHeight = screen.availHeight * 0.8;

		if (minHeight > maxHeight) {
			centralView.style.minHeight = Math.round(maxHeight) + 'px';
		}
	}
};
