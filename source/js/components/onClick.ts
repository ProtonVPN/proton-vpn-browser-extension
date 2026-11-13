'use popup';
export const onClick = (
	element: HTMLElement,
	callback: (event: MouseEvent | KeyboardEvent) => void,
) => {
	element.addEventListener('click', callback);
	element.addEventListener('keydown', (event) => {
		if (
			element === document.activeElement &&
			(event.key === 'Enter' || event.key === ' ')
		) {
			callback(event);
		}
	});
};
