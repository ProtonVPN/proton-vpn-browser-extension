import {
	makeFetchTransport,
	getDefaultIntegrations,
	BrowserClient,
	Scope,
	defaultStackParser,
} from '@sentry/browser';
import {getFullAppVersion, hostname, sentryDsn} from '../config';
import type {CacheItem, CacheWrappedValue} from '../tools/storage';
import {storage} from '../tools/storage';
import {getErrorAsString} from '../tools/getErrorMessage';
import {milliSeconds} from '../tools/milliSeconds';
import {CrashReports} from '../vpn/features/CrashReports';
import type {Toggle} from '../vpn/features/Toggle';

type FirstFetchParameter = Parameters<typeof fetch>[0];
let scope: Scope | undefined = undefined;

export const crashReportOptOut = storage.item<{value: boolean}>(
	'crash-reports-disabled',
);

const reverseKey = 'crash-reports-enabled';

export const crashReportOptIn: CacheItem<Toggle & CacheWrappedValue<boolean>> =
	{
		key: reverseKey,
		async get(
			defaultValue: CacheWrappedValue<boolean> | undefined = undefined,
			concurrencyDelay = 0,
		): Promise<CacheWrappedValue<boolean> | undefined> {
			const data = (await crashReportOptOut.get(
				defaultValue ? {value: !defaultValue.value} : undefined,
				concurrencyDelay,
			)) as CacheWrappedValue<boolean> | undefined;
			const value = data?.value;

			return typeof value === 'boolean'
				? {
						time: Date.now(),
						...(data || {}),
						value: !value,
					}
				: undefined;
		},
		getOnceNoLongerFetching(
			concurrencyDelay = 5_000,
			defaultValue: CacheWrappedValue<boolean>,
		): Promise<CacheWrappedValue<boolean> | undefined> {
			return this.get(defaultValue, concurrencyDelay) as Promise<
				CacheWrappedValue<boolean> | undefined
			>;
		},
		async load(
			defaultValue: CacheWrappedValue<boolean> | undefined = undefined,
		): Promise<Partial<CacheWrappedValue<boolean>>> {
			try {
				const value = (await crashReportOptOut.load(defaultValue)).value;

				return typeof value === 'boolean' ? {value: !value} : {};
			} catch {
				return {};
			}
		},
		set(value: {value: boolean}): Promise<void> {
			return crashReportOptOut.set({value: !value.value});
		},
		setValue(
			value: boolean,
			extraData: Record<string, any> = {},
		): Promise<void> {
			return crashReportOptOut.setValue(!value, extraData);
		},
		remove(): Promise<void> {
			return crashReportOptOut.remove();
		},
		async transaction<
			D extends CacheWrappedValue<boolean> | undefined =
				| CacheWrappedValue<boolean>
				| undefined,
		>(
			callback: (
				value: CacheWrappedValue<boolean> | D,
			) => CacheWrappedValue<boolean> | D | undefined,
			defaultValue: D = undefined as D,
		): Promise<void> {
			return crashReportOptOut.transaction((valueWrap) => {
				const invertedResult = callback({
					time: Date.now(),
					...(valueWrap ?? defaultValue),
					value: !valueWrap?.value,
				});

				return {
					...(invertedResult ?? defaultValue),
					value: !invertedResult?.value,
				};
			});
		},
		async transactionValue<D extends boolean | undefined = boolean | undefined>(
			callback: (value: boolean | D) => boolean | D | undefined,
			defaultValue: D = undefined as D,
		): Promise<void> {
			return crashReportOptOut.transactionValue(
				(value) => !callback(!value),
				!defaultValue,
			);
		},
	};

const isCrashReportEnabled = async () =>
	(await (await CrashReports.create()).getConfig()).value;

export const getContentTypeHeaders = (
	input: FirstFetchParameter,
): HeadersInit => {
	const url = input.toString();
	/**
	 * The sentry library does not append the content-type header to requests. The documentation states
	 * what routes accept what content-type. Those content-type headers are also expected through our sentry tunnel.
	 */
	if (url.includes('/envelope/')) {
		return {'content-type': 'application/x-sentry-envelope'};
	}

	if (url.includes('/store/')) {
		return {'content-type': 'application/json'};
	}

	return {};
};

const sentryFetch: typeof fetch = (input, init?) =>
	globalThis.fetch(input, {
		...init,
		headers: {
			...init?.headers,
			...getContentTypeHeaders(input),
		},
	});

const makeProtonFetchTransport = (options: any) =>
	makeFetchTransport(options, sentryFetch);

const getErrorReport = (error: any, message: string): Error => {
	if (error instanceof Error) {
		return error;
	}

	const report = new Error(message);
	(report as any).previous = error;

	return report;
};

const lastReport: Record<string, number> = {};

const getSampleRate = (message: string) => {
	if (/Failed to fetch/.test(message)) {
		return 0.03;
	}

	if (/Url already open/.test(message)) {
		return 0.05;
	}

	if (/Could not establish connection/.test(message)) {
		return 0.01;
	}

	if (/NetworkError when attempting to fetch resource/.test(message)) {
		return 0.1;
	}

	if (/Cannot fetch vpn\/v1\/browser\/token/.test(message)) {
		return 0.1;
	}

	if (/Invalid refresh token/.test(message)) {
		return 0.2;
	}

	if (/Network is unreachable/.test(message)) {
		return 0.4;
	}

	return 1;
};

export const initSentry = (): Scope => {
	if (scope) {
		return scope;
	}

	let sendings: number[] = [];

	const integrations = getDefaultIntegrations({}).filter(
		(defaultIntegration) =>
			![
				'BrowserApiErrors',
				'TryCatch',
				'Breadcrumbs',
				'GlobalHandlers',
			].includes(defaultIntegration.name),
	);

	const client = new BrowserClient({
		dsn: sentryDsn,
		release: getFullAppVersion(),
		environment: /\.proton.me$/.test(hostname) ? 'prod' : 'test',
		normalizeDepth: 5,
		transport: makeProtonFetchTransport,
		stackParser: defaultStackParser,
		// do not log calls to console.log, console.error, etc.
		integrations: integrations,
		// Disable client reports. Client reports are used by sentry to retry events that failed to send on visibility change.
		// Unfortunately Sentry does not use the custom transport for those, and thus fails to add the headers the API requires.
		sendClientReports: false,
		async beforeSend(event) {
			const sampleRate = (
				event.exception?.values?.map((exception) =>
					exception.value ? getSampleRate(exception.value) : 1,
				) as number[]
			).reduce((a, b) => Math.min(a, b), 1);

			if (sampleRate < 1 && Math.random() > sampleRate) {
				return null;
			}

			if (!(await isCrashReportEnabled())) {
				return null;
			}

			const now = Date.now();
			const minus10Minutes = now - 10 * 60 * 1000;
			sendings = sendings.filter((time) => time >= minus10Minutes);

			// Maximum 5 errors per 10 minutes
			if (sendings.length > 5) {
				return null;
			}

			sendings.push(now);

			return event;
		},
	});

	scope = new Scope();
	scope.setClient(client);

	client.init();

	return scope;
};

export const handleError = (error: any, sampleRate?: number) => {
	if (
		!error ||
		(typeof sampleRate !== 'undefined' && Math.random() >= sampleRate)
	) {
		return;
	}

	const code =
		typeof error === 'object' && 'Code' in error ? error.Code : undefined;

	switch (code) {
		case 86110:
		case 86111:
		case 86112:
		case 86113:
		case 86114:
		case 86115:
		case 86300:
			return;
	}

	const message = getErrorAsString(error);

	const now = Date.now();

	if (now - (lastReport?.[message] || 0) < milliSeconds.fromMinutes(5)) {
		return;
	}

	lastReport[message] = now;

	initSentry().captureException(getErrorReport(error, message));
};

export const watchWithSentry = <T>(action: () => T): T => {
	try {
		return action();
	} catch (error) {
		handleError(error);

		throw error;
	}
};

export const watchPromiseWithSentry = async <T>(
	action: () => Promise<T>,
): Promise<T> => {
	try {
		return await action();
	} catch (error) {
		handleError(error);

		throw error;
	}
};
