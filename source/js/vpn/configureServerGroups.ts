import {getStreamingConfig, StreamingService} from './getStreamingConfig';
import {c, getCountryNameOrCode} from '../tools/translate';
import {escapeHtml} from '../tools/escapeHtml';

export const configureServerGroups = (area?: HTMLElement) => {
	getStreamingConfig().then(streamingConfig => {
		if (!streamingConfig) {
			return;
		}

		const {ResourceBaseURL: baseUrl, StreamingServices: config} = streamingConfig;
		const defaultConfig = config['*'] || {};

		(area || document).querySelectorAll('.servers-group.with-tooltip').forEach(group => {
			const country = group.getAttribute('data-country-code') as string;
			const tier = group.getAttribute('data-tier') as string;
			const countryConfig = (config[country] || (country === 'GB' ? (config['UK'] || {}) : {}));
			const services = [
				...(countryConfig[tier] || []),
				...(defaultConfig[tier] || []),
			];

			if (services.length === 0) {
				return;
			}

			const values = {} as Record<string, StreamingService>;

			services.forEach(service => {
				values[service.Name] = service;
			});

			group.querySelectorAll('.group-tooltip').forEach((tooltip: any) => {
				group.removeChild(tooltip);
			});
			const newTooltip = document.createElement('div');
			newTooltip.innerHTML = `
				<svg class="open-button" height="16" viewBox="0 0 16 16" width="16">
					<use xlink:href="img/icons.svg#open-button"></use>
				</svg>
				<div class="expanded-tooltip">
					<div class="close-button">
						<svg width="24" height="24" viewBox="0 0 24 24">
							<use xlink:href="img/icons.svg#close-button"></use>
						</svg>
					</div>
                    <div class="tooltip-title streaming-info">${c('Title').t`Features`}</div>
                    <div class="tooltip-row streaming-info">
                    	<div class="tooltip-row-icon">
							<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" class="streaming-icon">
								<use xlink:href="img/icons.svg#streaming"></use>
							</svg>
						</div>
						<div class="tooltip-text">
							<h4>${c('Title').t`Streaming`} - ${getCountryNameOrCode(country)}</h4>
							<p>${
								c('Info').t`Connect to a Plus server in this country to start streaming.\n\nHint: Clear the cache of the streaming apps to ensure new content appears.`
									.replace(/\n/g, '<br />')
							}</p>
							<div class="streaming-logos">${
								Object.values(values).map(
									service => `<img
										loading="lazy"
										class="streaming-logo"
										src="${escapeHtml(baseUrl + service.Icon)}"
										alt="${escapeHtml(service.Name)}"
 									/>`,
								).join(' &nbsp; ')
							}</div>
							<p>${
								/* translator: this comes after a list of Streaming platforms */
								c('Info').t`and more`
							}</p>
						</div>
					</div>
				</div>
			`;
			newTooltip.setAttribute('class', 'group-tooltip');
			group.insertBefore(newTooltip, group.firstChild);
			newTooltip.querySelector('.open-button')?.addEventListener('click', () => {
				newTooltip.classList.add('open');
			});
			newTooltip.querySelector('.close-button')?.addEventListener('click', () => {
				newTooltip.classList.remove('open');
			});
		});
	});
};
