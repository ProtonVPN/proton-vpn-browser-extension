'use popup';
export const loadServerList = (
	area: HTMLElement,
	limitedUi: boolean,
	refresh: (search: string) => void,
) => {
	const servers = area.querySelector<HTMLDivElement>('#servers')!;
	servers.classList[limitedUi ? 'add' : 'remove']('not-allowed-by-plan');

	const setServersHtml = (html: string, search = '') => {
		if (servers.innerHTML !== html) {
			// nosemgrep:insecure-innerhtml
			servers.innerHTML = html;
		}

		if (search === '') {
			return;
		}

		refresh(search);
	};

	return {servers, setServersHtml};
};
