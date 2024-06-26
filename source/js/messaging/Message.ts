import {BackgroundAction} from './MessageType';

export interface MessageBase {
	extension?: string;
	token?: string;
}

export interface Message<T extends BackgroundAction = BackgroundAction> extends MessageBase {
	type: T;
}

export interface ForkMessage extends Message<BackgroundAction.FORK> {
	payload: {
		selector: string;
		keyPassword: string;
		persistent: boolean;
		trusted: boolean;
		state: string;
	};
}
