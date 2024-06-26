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
					<path fill-rule="evenodd" clip-rule="evenodd" d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15ZM9.74995 11C9.74995 11.3038 9.50371 11.55 9.19995 11.55H8.19995H7.19995C6.89619 11.55 6.64995 11.3038 6.64995 11C6.64995 10.6962 6.89619 10.45 7.19995 10.45H7.64995L7.64995 7.55H7.49994C7.19618 7.55 6.94994 7.30376 6.94994 7C6.94994 6.69624 7.19618 6.45 7.49994 6.45H8.19995C8.34582 6.45 8.48571 6.50795 8.58886 6.61109C8.69201 6.71424 8.74995 6.85413 8.74995 7L8.74995 10.45H9.19995C9.50371 10.45 9.74995 10.6962 9.74995 11ZM8 5.40002C8.3866 5.40002 8.7 5.08662 8.7 4.70002C8.7 4.31343 8.3866 4.00002 8 4.00002C7.6134 4.00002 7.3 4.31343 7.3 4.70002C7.3 5.08662 7.6134 5.40002 8 5.40002Z" />
				</svg>
				<div class="expanded-tooltip">
					<div class="close-button">
						<svg width="24" height="24" viewBox="0 0 24 24">
							<path fill-rule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
						</svg>
					</div>
                    <div class="tooltip-title streaming-info">${c('Title').t`Features`}</div>
                    <div class="tooltip-row streaming-info">
                    	<div class="tooltip-row-icon">
							<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" class="streaming-icon">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 6.00421C7.5 4.75768 8.93047 4.05335 9.91848 4.81335L17.7136 10.8095C18.4955 11.411 18.4955 12.5898 17.7136 13.1913L9.91848 19.1875C8.93047 19.9475 7.5 19.2431 7.5 17.9966L7.5 6.00421ZM9.00002 6.00275C9.00001 6.0032 9 6.00369 9 6.00421L9 17.9966C9 17.9971 9.00001 17.9976 9.00002 17.9981C9.00042 17.9983 9.00086 17.9985 9.00136 17.9988C9.00185 17.999 9.00232 17.9992 9.00274 17.9994C9.00311 17.9991 9.0035 17.9988 9.00392 17.9985L16.7991 12.0023C16.7994 12.0021 16.7997 12.0018 16.7999 12.0016C16.8 12.0013 16.8 12.0009 16.8 12.0004C16.8 11.9999 16.8 11.9995 16.7999 11.9992C16.7997 11.999 16.7994 11.9987 16.7991 11.9985L9.00392 6.00229C9.0035 6.00197 9.00311 6.00168 9.00274 6.00141C9.00232 6.00159 9.00185 6.00179 9.00136 6.00204C9.00086 6.00228 9.00042 6.00252 9.00002 6.00275Z" />
							</svg>
						</div>
						<div class="tooltip-text">
							<h4>${c('Title').t`Streaming`} - ${getCountryNameOrCode(country)}</h4>
							<p>${
								c('Info').t`Connect to a Plus server in this country to start streaming.\n\nHint: Clear the cache of the streaming apps to ensure new content appears.`
									.replace(/\n/g, '<br />')
							}</p>
							<div class="streaming-logos">${
								Object.values(values).map(service => `<img
										class="streaming-logo"
										src="${escapeHtml(baseUrl + service.Icon)}"
										alt="${escapeHtml(service.Name)}"
 									/>`).join(' &nbsp; ')
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
