import {SplitTunnelingMode, StoredWebsiteFilterList, WebsiteFilterList, WebsiteFilter} from './WebsiteFilter';

/**
 * Manages domain lists for split tunneling with proper mode isolation.
 * Accepts potentially incomplete data and ensures all properties are initialized.
 */
export const defaultSplitTunnelingMode = SplitTunnelingMode.Exclude;

export class SplitTunnelingDomainManager {
	private readonly list: WebsiteFilterList;

	constructor(list: StoredWebsiteFilterList) {
		this.list = {
			...list,
			value: (list.value || []).map(filter => ({
				mode: SplitTunnelingMode.Exclude, // If user has filter with no mode from previous version, it's an exclusion
				...filter,
			})),
			mode: list.mode || defaultSplitTunnelingMode, // If user has no mode set from previous version, it's exclude
			enabled: list.enabled ?? this.shouldBeEnabledByDefaultFor(list), // Enable if user previous set an exclusion list
		};
	}

	private shouldBeEnabledByDefaultFor(list: StoredWebsiteFilterList): boolean {
		const mode = list.mode || defaultSplitTunnelingMode;
		const domains = (list.value || []).filter(
			domain => (domain.mode || defaultSplitTunnelingMode) === mode,
		);

		return mode === SplitTunnelingMode.Include || domains.length > 0;
	}

	getDomainsForCurrentMode(): WebsiteFilter[] {
		return this.list.value.filter(domain => domain.mode === this.list.mode);
	}

	addDomain(domainName: string, withSubDomains: boolean): void {
		// Check if domain already exists in current mode
		const existsInCurrentMode = this.getDomainsForCurrentMode()
			.some(domain => domain.domain === domainName);

		if (!existsInCurrentMode) {
			this.list.value.push({
				domain: domainName,
				withSubDomains,
				mode: this.getCurrentMode(),
			});
		}
	}

	removeDomain(domainName: string): boolean {
		const initialLength = this.list.value.length;
		this.list.value = this.list.value.filter(
			domain => !(domain.domain === domainName && domain.mode === this.list.mode)
		);

		return this.list.value.length < initialLength;
	}

	/**
	 * @returns true if the mode really changed.
	 */
	switchMode(newMode: SplitTunnelingMode): boolean {
		if (this.list.mode === newMode) {
			return false;
		}

		this.list.mode = newMode;

		return true;
	}

	getCurrentMode(): SplitTunnelingMode {
		return this.list.mode;
	}

	isEnabled(): boolean {
		return this.list.enabled;
	}

	setEnabled(enabled: boolean): void {
		this.list.enabled = enabled;
	}

	getRawList(): WebsiteFilterList {
		return this.list;
	}

	hasDomainInCurrentMode(domainName: string): boolean {
		return this.getDomainsForCurrentMode()
			.some(domain => domain.domain === domainName);
	}

	getCurrentModeDomainsCount(): number {
		return this.getDomainsForCurrentMode().length;
	}
}
