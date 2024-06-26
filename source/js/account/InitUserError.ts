import {ApiError} from '../api';

export class InitUserError extends Error {
	constructor(
		message: string,
		public readonly Code: ApiError['Code'] = 86300,
		public readonly Details: ApiError['Details'] = {Type: 'DeviceLimit'},
	) {
		super(message);

		if (!this.Details.Body) {
			this.Details.Body = message;
		}
	}
}
