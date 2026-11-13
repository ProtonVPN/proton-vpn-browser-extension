'use popup';
export const remove = (
	container: Element | undefined | null,
	selector: string,
) => {
	container?.querySelectorAll(selector).forEach((element) => {
		element.remove();
	});
};
