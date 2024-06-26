export interface ForkResponse {
	token?: string;
	type: 'error' | 'success';
	payload?: {
		title?: string;
		message?: string;
	};
}
