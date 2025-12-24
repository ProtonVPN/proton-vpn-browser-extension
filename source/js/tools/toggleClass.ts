export const toggleClass = (
	element: HTMLElement,
	toggled: boolean,
	classWhenToggled: string,
	classWhenUntoggled: string,
) => {
	element.classList.remove(toggled ? classWhenUntoggled : classWhenToggled);
	element.classList.add(toggled ? classWhenToggled : classWhenUntoggled);
};
