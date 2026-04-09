export const stopEvent = (event: Event) => {
	event.stopImmediatePropagation?.();
	event.stopPropagation();
	event.preventDefault();

	return false;
};
