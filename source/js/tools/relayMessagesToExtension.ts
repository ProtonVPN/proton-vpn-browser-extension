import {baseDomainURL} from '../../../config';

export const relayMessagesToExtension = (
	source: Window,
	runtime: typeof browser.runtime,
) => {
	runtime.connect();

	source.addEventListener(
		'message',
		(event) => {
			if (event.source != source) {
				return;
			}

			const [protocol, domain] = `${event.origin}://`.split('://');

			if (protocol !== 'https' || !domain) {
				return;
			}

			const mainDomain = domain.replace(/^[^/]+\.([^./]+\.[^./]+)$/, '$1');
			const baseDomain = baseDomainURL
				.replace(/^[^/]+:\/\//, '')
				.replace(/^[^/]+:\/\/([^/]+)\/.*$/, '$1')
				.replace(/^[^/]+\.([^./]+\.[^./]+)$/, '$1');

			if (mainDomain === 'proton.me' || mainDomain === baseDomain) {
				runtime.sendMessage(event.data);
			}
		},
		false,
	);
};
