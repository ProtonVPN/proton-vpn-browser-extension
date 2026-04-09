import {c} from '../../tools/translate';
import type {FeatureConfig} from './getFeatureConfig';

export abstract class FeatureWrapper<T extends object = object> {
	protected constructor(private config: FeatureConfig<T>) {}

	static create(): Promise<FeatureWrapper> {
		throw new Error('Missing static async create() implementation');
	}

	/**
	 * Is available in the current version of the extension.
	 */
	isAvailable(): boolean {
		return true;
	}

	/**
	 * User can change the options (meaning it's not disabled by device local instructions)
	 */
	isControllable(): boolean {
		return this.config.controllable;
	}

	/**
	 * Get the message to the user to explain why the config cannot be changed.
	 * - Can be customized via the config.json file
	 * - Else fallback to a default message
	 */
	getControlMessage(): string {
		return this.config.controlMessage ?? this.getDefaultControlMessage();
	}

	/**
	 * Get default message to explain why the config cannot be changed when
	 * no custom message is set in config.json.
	 */
	getDefaultControlMessage(): string {
		return c('Info').t`This option cannot be changed on this device`;
	}

	/**
	 * Load the current config for the feature
	 * - as per user choice if controllable,
	 * - or as per device local instructions if present,
	 * - else use the default config for this feature.
	 */
	async getConfig(): Promise<T> {
		return (
			(this.isControllable() ? await this.getUserConfig() : undefined) ??
			this.config.config ??
			this.getDefault()
		);
	}

	/**
	 * Retrieve the config set by the user.
	 */
	abstract getUserConfig(): Promise<T | undefined>;

	/**
	 * Get default config for this feature.
	 */
	abstract getDefault(): T;
}
