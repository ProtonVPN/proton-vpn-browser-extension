export const isInBackground = () => (
	typeof window === 'undefined' ||
	window.location.href.indexOf('_generated_background_page.html') !== -1
);
