import {
	ApiError,
	DeviceLimitErrorDetails,
	ErrorAction,
	ErrorActionCategory,
	ErrorActionCode,
	isDeviceLimitError,
	needsUpdate,
} from '../api';
import {ErrorDump} from '../vpn/ConnectionState';
import {c} from './translate';
import {escapeHtml} from './escapeHtml';
import {accountURL} from '../config';
import {getKeys} from './getKeys';
import {warn} from '../log/log';

function getActionLink(action: ErrorAction): string {
	const classes = [
		({
			[ErrorActionCategory.MAIN_ACTION]: 'primary-button wide-button',
			[ErrorActionCategory.SECONDARY_ACTION]: 'secondary-button wide-button',
		} as Record<ErrorAction['Category'], string>)[action.Category] || '',
		({
			[ErrorActionCode.UPGRADE]: 'upgrade-button',
		})[action.Code] || '',
	].filter(Boolean).join(' ');

	return `<a class="${classes}" href="${action.URL.replace(/^\//, accountURL)}">${c('Action').t`Upgrade`}</a>`;
}

export function getErrorAsString(error: any, allowHtml = false): string {
	const message = (error as ApiError).Error || (error as any as Error).message || error;

	if (message instanceof Error) {
		return message.message;
	}

	if (typeof message === 'string') {
		return message;
	}

	warn(message);

	const strMessage = `${error}`.replace(/^TypeError:\s+/, '');

	if (/\[object/.test(strMessage)) {
		warn(message);

		const keys = getKeys(message);

		if (!allowHtml || keys.length === 0 || keys.join(',') === '_id') {
			return c('Error').t`Something went wrong. If the problem persists, please try to re-install the extension`;
		}

		return '<pre>' + escapeHtml(JSON.stringify(message, null, 2)) + '</pre>';
	}

	return strMessage;
}

function parseErrorBody(body: DeviceLimitErrorDetails['Body']): string | undefined {
	if (!body || typeof body === 'string') {
		return body;
	}

	return body.map(component => {
		switch (component.Component) {
			case 'Feature':
				const svgContent = {
					world: `<path fill-rule="evenodd" d="M20.9 13.345C20.251 17.677 16.514 21 12 21c-4.417 0-8.091-3.182-8.855-7.38a3.75 3.75 0 0 0 3.356.995l.54-.108a.75.75 0 0 1 .868.53l.906 3.17a2.225 2.225 0 0 0 4.3-.07l.222-.893a.75.75 0 0 1 .312-.442l1.436-.957a2.25 2.25 0 0 0 .764-.866l.088-.177a2.25 2.25 0 0 0-.421-2.597L14.47 11.16a2.25 2.25 0 0 0-1.591-.659h-1.34a.751.751 0 0 1-.279-.054l-1.934-.774A.349.349 0 0 1 9.456 9h1.55a1.783 1.783 0 0 0 1.26-3.044L11.312 5l1.808-.3a2.25 2.25 0 0 0 1.665-1.26 9.001 9.001 0 0 1 3.64 2.26l-1.097.548A2.25 2.25 0 0 0 16.2 8.971l.813 2.44a2.25 2.25 0 0 0 1.693 1.495l2.194.439Zm-1.494-6.46A8.956 8.956 0 0 1 21 11.835l-1.998-.4a.75.75 0 0 1-.565-.498l-.813-2.44A.75.75 0 0 1 18 7.589l1.407-.704ZM12 3c.407 0 .807.027 1.2.08a.748.748 0 0 1-.327.14l-1.809.3c-1.203.201-1.677 1.678-.814 2.54l.956.957a.283.283 0 0 1-.2.483h-1.55a1.849 1.849 0 0 0-.687 3.565l1.934.774c.266.106.55.161.836.161h1.34a.75.75 0 0 1 .53.22l1.046 1.046a.75.75 0 0 1 .14.866l-.088.176a.75.75 0 0 1-.255.289l-1.436.957a2.25 2.25 0 0 0-.934 1.327l-.223.891a.726.726 0 0 1-1.402.024l-.906-3.172a2.25 2.25 0 0 0-2.605-1.588l-.54.108a2.25 2.25 0 0 1-2.24-.857l-.918-1.223A9.001 9.001 0 0 1 12 3Zm0 19.5c5.799 0 10.5-4.701 10.5-10.5S17.799 1.5 12 1.5 1.5 6.201 1.5 12 6.201 22.5 12 22.5Z" clip-rule="evenodd"/>`,
					incognito: `<path fill-rule="evenodd" d="M14.517 3.247a3 3 0 0 1 4.1 2.031l1.485 5.977h1.648a.75.75 0 1 1 0 1.5H2.25a.75.75 0 0 1 0-1.5h1.649l1.484-5.977a3 3 0 0 1 4.1-2.031l1.626.701a2.25 2.25 0 0 0 1.782 0l1.626-.701Zm2.645 2.393a1.5 1.5 0 0 0-2.05-1.016l-1.627.702a3.75 3.75 0 0 1-2.97 0l-1.626-.702a1.5 1.5 0 0 0-2.05 1.016l-1.38 5.555h13.082l-1.38-5.555Zm-7.305 9.515a3.75 3.75 0 1 0 .643 2.1 1.5 1.5 0 1 1 3 0 3.75 3.75 0 1 0 .643-2.1 2.991 2.991 0 0 0-2.143-.9 2.99 2.99 0 0 0-2.143.9ZM9 17.255a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm6 0a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 0 0-4.5 0Z" clip-rule="evenodd"/>`,
					play: `<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 6.00421C7.5 4.75768 8.93047 4.05335 9.91848 4.81335L17.7136 10.8095C18.4955 11.411 18.4955 12.5898 17.7136 13.1913L9.91848 19.1875C8.93047 19.9475 7.5 19.2431 7.5 17.9966L7.5 6.00421ZM9.00002 6.00275C9.00001 6.0032 9 6.00369 9 6.00421L9 17.9966C9 17.9971 9.00001 17.9976 9.00002 17.9981C9.00042 17.9983 9.00086 17.9985 9.00136 17.9988C9.00185 17.999 9.00232 17.9992 9.00274 17.9994C9.00311 17.9991 9.0035 17.9988 9.00392 17.9985L16.7991 12.0023C16.7994 12.0021 16.7997 12.0018 16.7999 12.0016C16.8 12.0013 16.8 12.0009 16.8 12.0004C16.8 11.9999 16.8 11.9995 16.7999 11.9992C16.7997 11.999 16.7994 11.9987 16.7991 11.9985L9.00392 6.00229C9.0035 6.00197 9.00311 6.00168 9.00274 6.00141C9.00232 6.00159 9.00185 6.00179 9.00136 6.00204C9.00086 6.00228 9.00042 6.00252 9.00002 6.00275Z" />`,
				}[component.Icon] || '';

				return `<div class="feature-row">
					<div style="width: 40px; flex: 0;">${
						svgContent ? `<svg class="feature-icon" viewBox="0 0 24 24">${svgContent}</svg>` : ''
					}</div>
					<div style="flex: 1;">${component.Text}</div>
				</div>`;

			default:
				return `<div>${component.Text}</div>`;
		}
	}).join('');
}

function getErrorIllustration(code: number | null | undefined): string | undefined {
	switch (code) {
		case 86110:
		case 86111:
		case 86112:
		case 86113:
		case 86114:
		case 86115:
		case 86300:
			return '/img/illustration-maximum-device-limit@2x.png';

		case 86151:
			return '/img/illustration-free-user-upsell@2x.png';

		default:
			return undefined;
	}
}

export function getErrorMessage(error: ApiError | Error | ErrorDump) {
	if (needsUpdate(error) || isDeviceLimitError(error)) {
		const apiError = error as ApiError;
		const errorCode = apiError.Code;
		const parsedBody = parseErrorBody(apiError.Details?.Body);
		const body = parsedBody || (errorCode === 86151
			? /*
			* translator: This sentence is followed by an Upgrade button
			*/ c('Action').t`Subscribe to enable Browser Extension`
			: /*
			* translator: This sentence is followed by an Upgrade button
			*/ c('Action').t`Subscribe to connect more devices`
		);
		const errorFallback = (apiError.Details?.Title || apiError.Details?.Hint || parsedBody)
			? ''
			: `<div class="error-message" style="max-width: 348px;">${getErrorAsString(error, true)}</div>`;
		const illustration = getErrorIllustration(errorCode);

		return {
			restartOnClose: (errorCode === 86300),
			blockingError: `
				${errorFallback}
				<div class="text-center" style="padding: 20px; line-height: 1.4em;">
					${errorCode ? `<img src="${illustration}" alt="" style="max-width: 248px;" />` : ''}
					${apiError.Details?.Title ? `<p style="padding-bottom: 10px; margin: 0 20px; font-weight: bold; font-size: 16px; line-height: 26px;">${apiError.Details?.Title}</p>` : ''}
					<p style="padding-bottom: 10px; font-size: 12px; line-height: 18px;">${body}</p>
					${apiError.Details?.Hint ? `<p style="padding-bottom: 10px; opacity: 0.8; font-size: 10px; line-height: 16px;">${apiError.Details?.Hint}</p>` : ''}
					${(apiError.Details?.Actions || []).map(getActionLink).join('')}
				</div>
			`,
		};
	}

	return {
		error: `<div class="error-message">
			<div class="icon">
				<svg viewBox="0 0 24 24">
					<path fill-rule="evenodd" d="M22.349 22.5H1.65c-1.266 0-2.06-1.341-1.431-2.42l10.35-17.765c.632-1.087 2.23-1.087 2.862 0l10.35 17.765c.627 1.079-.166 2.42-1.432 2.42ZM12 7.135c.934 0 1.656.803 1.54 1.712l-.722 5.667a.819.819 0 0 1-.818.708.82.82 0 0 1-.818-.708l-.722-5.667c-.116-.909.606-1.712 1.54-1.712Zm1.154 10.513c0 .625-.517 1.132-1.154 1.132a1.143 1.143 0 0 1-1.154-1.133c0-.625.517-1.132 1.154-1.132.637 0 1.154.507 1.154 1.133Z" clip-rule="evenodd"/>
				</svg>
			</div>
			<div class="text">${getErrorAsString(error, true).replace(/\n/g, '<br>')}</div>
			<button class="close-button">
				<svg viewBox="0 0 24 24">
					<path fill-rule="evenodd" d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
				</svg>
			</button>
		</div>`,
	};
}
