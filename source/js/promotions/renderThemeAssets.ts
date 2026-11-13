'use popup';
interface Props {
	values: {
		theme: 'dark' | 'light';
		url: string;
	}[];
	parent: HTMLElement;
	alternativeText: string;
}

export const renderThemeAssets = ({alternativeText, parent, values}: Props) => {
	for (const value of values) {
		const image = document.createElement('img');
		image.className = `promotion-image-${value.theme}`;
		image.src = value.url || '';
		image.alt = alternativeText;

		parent.appendChild(image);
	}
};
