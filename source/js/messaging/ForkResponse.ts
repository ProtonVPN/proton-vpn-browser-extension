export interface ForkResponse {
	token?: string;
	type: 'error' | 'success';
	partnerId?: string;
	payload?: {
		title?: string;
		message?: string;
	};
}
