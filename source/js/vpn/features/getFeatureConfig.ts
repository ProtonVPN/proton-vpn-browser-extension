import {storage, Storage} from '../../tools/storage';

const managedConfig = storage.selfItem('config', Storage.MANAGED);

export interface FeatureConfig<T extends object = object> {
	controllable: boolean;
	controlMessage?: string;
	config?: T;
}

export const config = (() => {
	let config: Record<string, FeatureConfig> | undefined = undefined;

	return {
		get: () => config,
		set(value: Record<string, FeatureConfig> | undefined) {
			config = value;
		},
	};
})();

const loadConfig = async () => {
	try {
		return (
			(await managedConfig.get()) ||
			(await (await fetch('/config.json')).json()) ||
			{}
		);
	} catch {
		return {};
	}
};

const getConfig = async () => {
	if (!config.get()) {
		config.set(await loadConfig());
	}

	return config.get() as Record<string, FeatureConfig>;
};

export const getFeatureConfig = async <T extends object = object>(
	name: string,
) =>
	({
		controllable: true,
		...(await getConfig())[name],
	}) as FeatureConfig<T>;
