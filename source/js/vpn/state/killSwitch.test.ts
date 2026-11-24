import {beforeEach, describe, expect, it, vi} from 'vitest';

const {stored, proxy, notify} = vi.hoisted(() => ({
	/** Session storage, kept across vi.resetModules() like a background restart */
	stored: new Map<string, unknown>(),
	proxy: {
		setProxyToWaiterHost: vi.fn(async () => true),
		clearProxy: vi.fn(async () => true),
		hasProxy: vi.fn(async () => false),
		getProxyLevelOfControl: vi.fn(async () => undefined),
	},
	notify: vi.fn(),
}));

vi.mock('../../tools/storage', () => {
	const item = (key: string) => ({
		get: async () => stored.get(key),
		setValue: async (value: unknown) => {
			stored.set(key, {value});
		},
	});

	return {
		Storage: {LOCAL: 'local', SESSION: 'session', MANAGED: 'managed'},
		storage: {item, selfItem: item},
	};
});
vi.mock('../../tools/sentry', () => ({handleError: vi.fn()}));
vi.mock('../../tools/proxy', () => proxy);
vi.mock('../../tools/notifyStateChange', () => ({notifyStateChange: notify}));
vi.mock('../../tools/browserAction', () => ({setButton: vi.fn()}));
vi.mock('../../tools/translate', () => ({
	c: () => ({
		t: (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v),
	}),
}));
vi.mock('../../log/log', () => {
	const noop = () => {};

	return {bind: () => noop, info: noop, debug: noop, warn: noop, error: noop};
});
vi.mock('../../account/credentials/getConnectionCredentials', () => ({
	cancelNextCredentialFetch: vi.fn(),
}));
vi.mock('../../account/clearAccountData', () => ({
	clearAccountData: async () => {},
}));
vi.mock('../../account/getAccessToken', () => ({
	getAccessToken: async () => 'token',
}));
vi.mock('../../notifications/emitNotification', () => ({
	emitNotification: vi.fn(),
}));
vi.mock('../reviewInfo', () => ({
	setReviewInfoStateOnFailedConnection: vi.fn(),
}));
vi.mock('../toProxyServer', () => ({toProxyServer: vi.fn()}));
vi.mock('../getAutoConnectTarget', () => ({
	getAutoConnectTarget: async () => undefined,
}));
vi.mock('../proxy/proxyTakeoverReconnection', () => ({
	cancelProxyTakeoverReconnection: vi.fn(),
	scheduleProxyTakeoverReconnection: vi.fn(),
	getProxyTakeoverReconnectionServer: async () => undefined,
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Fresh modules, as after a background restart (storage is kept) */
const load = async () => {
	vi.resetModules();
	const store = await import('./stateStore');
	await import('./off');
	await import('./loggedout');
	const actions = await import('./actions');
	const killSwitch = await import('./killSwitch');
	store.createInitialState();

	return {...store, ...actions, ...killSwitch};
};

const lastDisconnected = () =>
	notify.mock.calls
		.filter(([state]) => state === 'disconnected')
		.slice(-1)[0]?.[1];

describe('kill switch', () => {
	beforeEach(() => {
		stored.clear();
		vi.clearAllMocks();
	});

	it('does not block when the user was never protected', async () => {
		const {disconnect} = await load();
		disconnect(new Error('Server down'));
		await flush();

		expect(proxy.setProxyToWaiterHost).not.toHaveBeenCalled();
		expect(proxy.clearProxy).toHaveBeenCalled();
		expect(lastDisconnected()).toMatchObject({blocked: false});
	});

	it('blocks traffic on a failure after being protected', async () => {
		const {disconnect, armKillSwitch, current} = await load();
		armKillSwitch();
		disconnect(new Error('Server down'));
		await flush();

		expect(proxy.setProxyToWaiterHost).toHaveBeenCalled();
		expect(proxy.clearProxy).not.toHaveBeenCalled();
		expect(current().data.blocked).toBe(true);
		expect(lastDisconnected()).toMatchObject({blocked: true});
	});

	it('blocks on involuntary switch to off (no disconnect() call)', async () => {
		const {switchState, armKillSwitch} = await load();
		armKillSwitch();
		switchState('off');
		await flush();

		expect(proxy.setProxyToWaiterHost).toHaveBeenCalled();
		expect(proxy.clearProxy).not.toHaveBeenCalled();
	});

	it('lifts the block on explicit disconnect', async () => {
		const {disconnect, armKillSwitch, isKillSwitchArmed} = await load();
		armKillSwitch();
		disconnect(new Error('Server down'));
		await flush();
		vi.clearAllMocks();

		disconnect();
		await flush();

		expect(await isKillSwitchArmed()).toBe(false);
		expect(proxy.setProxyToWaiterHost).not.toHaveBeenCalled();
		expect(proxy.clearProxy).toHaveBeenCalled();
		expect(lastDisconnected()).toMatchObject({blocked: false});
	});

	it('lifts the block on logout', async () => {
		const {logOut, armKillSwitch, isKillSwitchArmed} = await load();
		armKillSwitch();
		logOut(false);
		await flush();

		expect(await isKillSwitchArmed()).toBe(false);
		expect(proxy.clearProxy).toHaveBeenCalled();
	});

	it('stays blocked after a background restart', async () => {
		const first = await load();
		first.armKillSwitch();
		first.disconnect(new Error('Server down'));
		await flush();
		vi.clearAllMocks();

		const {switchState, isKillSwitchArmed} = await load();
		expect(await isKillSwitchArmed()).toBe(true);
		switchState('off');
		await flush();

		expect(proxy.setProxyToWaiterHost).toHaveBeenCalled();
		expect(proxy.clearProxy).not.toHaveBeenCalled();
	});

	it('does not claim blocked when the proxy is controlled elsewhere', async () => {
		const {disconnect, armKillSwitch} = await load();
		proxy.setProxyToWaiterHost.mockResolvedValueOnce(false);
		armKillSwitch();
		disconnect(new Error('Taken over'));
		await flush();

		expect(proxy.clearProxy).toHaveBeenCalled();
		expect(lastDisconnected()).toMatchObject({blocked: false});
	});
});
