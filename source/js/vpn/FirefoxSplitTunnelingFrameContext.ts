export type FirefoxInheritedRoute = 'proxy' | 'direct';

interface FirefoxFrameRouteContext {
	parentFrameId: number;
	route: FirefoxInheritedRoute;
}

type TabFrameContexts = Map<number, FirefoxFrameRouteContext>;

export class FirefoxSplitTunnelingFrameContext {
	private readonly tabs = new Map<number, TabFrameContexts>();

	clear(): void {
		this.tabs.clear();
	}

	clearTab(tabId: number): void {
		this.tabs.delete(tabId);
	}

	clearFrameSubtree(tabId: number, frameId: number): void {
		const tabFrames = this.tabs.get(tabId);

		if (!tabFrames) {
			return;
		}

		const frameIdsToDelete = new Set<number>([frameId]);
		let previousSize = -1;

		while (frameIdsToDelete.size !== previousSize) {
			previousSize = frameIdsToDelete.size;

			tabFrames.forEach((context, childFrameId) => {
				if (frameIdsToDelete.has(context.parentFrameId)) {
					frameIdsToDelete.add(childFrameId);
				}
			});
		}

		frameIdsToDelete.forEach((id) => {
			tabFrames.delete(id);
		});

		if (tabFrames.size === 0) {
			this.tabs.delete(tabId);
		}
	}

	replaceFrameRoute(
		tabId: number,
		frameId: number,
		parentFrameId: number,
		route: FirefoxInheritedRoute | undefined,
	): void {
		if (frameId === 0) {
			this.clearTab(tabId);
		} else {
			this.clearFrameSubtree(tabId, frameId);
		}

		if (!route) {
			return;
		}

		let tabFrames = this.tabs.get(tabId);

		if (!tabFrames) {
			tabFrames = new Map();
			this.tabs.set(tabId, tabFrames);
		}

		tabFrames.set(frameId, {
			parentFrameId,
			route,
		});
	}

	getFrameRoute(tabId: number, frameId: number): FirefoxInheritedRoute | undefined {
		return this.tabs.get(tabId)?.get(frameId)?.route;
	}

	getInheritedRoute(
		tabId: number,
		frameId: number,
		parentFrameId: number,
	): FirefoxInheritedRoute | undefined {
		const tabFrames = this.tabs.get(tabId);

		if (!tabFrames) {
			return undefined;
		}

		const exactMatch = tabFrames.get(frameId);

		if (exactMatch) {
			return exactMatch.route;
		}

		return parentFrameId >= 0 ? tabFrames.get(parentFrameId)?.route : undefined;
	}
}
