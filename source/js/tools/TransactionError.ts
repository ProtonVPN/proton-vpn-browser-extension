export class TransactionError extends Error {
	constructor(message?: string) {
		super(message ?? 'Already in a transaction');
	}
}
