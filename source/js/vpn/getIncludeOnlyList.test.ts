import {getIncludeOnlyList} from './getIncludeOnlyList';
import {SplitTunnelingMode} from './WebsiteFilter';

describe('getIncludeOnlyList', () => {
	it('should return undefined when split tunneling is undefined', () => {
		const list = getIncludeOnlyList(undefined);

		expect(list).toBe(undefined);
	});

	it('should return undefined when split tunneling is exclude', () => {
		const list = getIncludeOnlyList({
			filteredDomains: ['foo'],
			mode: SplitTunnelingMode.Exclude,
		});

		expect(list).toBe(undefined);
	});

	it('should return the needed domains when split tunneling is include and there is no added domain', () => {
		const list = getIncludeOnlyList({
			filteredDomains: [],
			mode: SplitTunnelingMode.Include,
		});

		expect(list).toEqual(['.protonvpn.net', '.protonvpn.com']);
	});

	it('should return the needed domains and the added by the user when split tunneling is include and there is added domains', () => {
		const list = getIncludeOnlyList({
			filteredDomains: ['foo.com'],
			mode: SplitTunnelingMode.Include,
		});

		expect(list).toEqual(['foo.com', '.protonvpn.net', '.protonvpn.com']);
	});
});
