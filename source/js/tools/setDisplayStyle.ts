export const setDisplayStyle = (
	element: HTMLElement | null | undefined,
	display: string,
) => {
	if (element) {
		element.style.display = display;
	}
};
