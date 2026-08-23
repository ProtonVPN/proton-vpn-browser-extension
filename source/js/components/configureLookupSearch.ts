import type {UserContext} from '../account/user/UserContext';
import {lookupLogical} from '../vpn/lookupLogical';
import {isLogicalConnectable} from '../vpn/isLogicalConnectable';
import {Feature} from '../vpn/Feature';
import {getErrorAsString} from '../tools/getErrorMessage';
import {c} from '../tools/translate';
import {getExactMatchSearchResult} from '../search/getExactMatchSearchResult';
import {getNoResultBlock} from '../search/getNoResultBlock';
import type {Logical} from '../vpn/Logical';
import type {CountryList} from './countryList';
import {attachLogicalIntoCountryList} from '../vpn/attachLogicalIntoCountryList';

class LookupRequest {
	private timeout: NodeJS.Timeout | undefined;
	private abort: AbortController;
	private divs: NodeListOf<HTMLDivElement> | HTMLDivElement[];

	constructor(
		private userContext: UserContext = {country: 'XX', tier: 0},
		private countries: CountryList = {},
		private configurator: (div: HTMLDivElement) => void = () => {},
		private search: string = '',
		private area: HTMLElement | undefined = undefined,
	) {
		this.abort = new AbortController();
		this.divs =
			this.area?.querySelectorAll<HTMLDivElement>('.lookup-result') || [];
		this.timeout = search && this.divs.length ? this.delayLookup() : undefined;
	}

	public has(
		userContext: UserContext,
		countries: CountryList,
		search: string,
		area: HTMLElement | undefined,
	): boolean {
		return (
			this.userContext.tier === userContext.tier &&
			this.userContext.country === userContext.country &&
			// Ignoring userContext.location is fine for lookup
			this.countries === countries &&
			this.search === search &&
			this.area === area
		);
	}

	public cancel() {
		if (this.search === '') {
			return;
		}

		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		this.abort.abort();
	}

	private async lookup(): Promise<void> {
		try {
			this.showResult(
				getExactMatchSearchResult(
					this.userContext,
					await this.searchLogical(),
				) || getNoResultBlock(),
			);
		} catch (e) {
			this.showResult(
				`<div class="error-message">${getErrorAsString(e)}</div>`,
			);
		}
	}

	private async searchLogical() {
		this.abort.abort();
		this.abort = new AbortController();
		const result = await lookupLogical(this.search, {
			signal: this.abort.signal,
		});

		if (result && !isLogicalConnectable(result)) {
			throw new Error(this.getUnsupportedLogicalErrorMessage(result));
		}

		if (result) {
			attachLogicalIntoCountryList(
				this.userContext.tier,
				result,
				this.countries,
			);
		}

		return result;
	}

	private showResult(html: string): void {
		if (this.abort.signal.aborted) {
			return;
		}

		this.divs.forEach((div) => {
			div.innerHTML = html;
			this.configurator(div);
		});
	}

	private getUnsupportedLogicalErrorMessage(logical: Logical): string {
		if (logical.Features & Feature.TOR) {
			return c('Info')
				.t`Tor servers such as ${logical.Name} are not currently supported in the browser extension`;
		}

		if (logical.Features & Feature.RESTRICTED) {
			return c('Info')
				.t`Connecting to dedicated IPs such as ${logical.Name} is not currently supported in the browser extension`;
		}

		return c('Info')
			.t`Connecting servers such as ${logical.Name} is not currently supported in the browser extension`;
	}

	private delayLookup(): NodeJS.Timeout {
		return setTimeout(() => {
			this.timeout = undefined;

			void this.lookup();
		}, 400);
	}
}

let currentRequest = new LookupRequest();

export const configureLookupSearch = (
	area: HTMLElement,
	userContext: UserContext,
	configurator: (div: HTMLDivElement) => void = () => {},
	countries: CountryList,
	search = '',
) => {
	if (currentRequest.has(userContext, countries, search, area)) {
		return;
	}

	currentRequest.cancel();
	currentRequest = new LookupRequest(
		userContext,
		countries,
		configurator,
		search,
		area,
	);
};
