type Resolver<T> = (value: T) => void;

type Rejecter<E> = (error: E) => void;

type WaitingResponse<T, E> = [Resolver<T>, Rejecter<E>];

/**
 * Group concurrent calls of a same asynchronous operation into a single one.
 *
 * While a first call is pending, following calls don't run the callback again,
 * they wait for the pending one and get its result (or its error).
 */
export class GroupResponder<T, E = Error> {
	private pending = false;

	private waitingResponses: WaitingResponse<T, E>[] = [];

	public async handle(callback: () => Promise<T>): Promise<T> {
		if (this.pending) {
			return await new Promise<T>((resolve, reject) => {
				this.waitingResponses.push([resolve, reject]);
			});
		}

		this.pending = true;

		try {
			const response = await callback();

			this.flush(([resolve]) => resolve(response));

			return response;
		} catch (error) {
			this.flush(([, reject]) => reject(error as E));

			throw error;
		} finally {
			this.pending = false;
		}
	}

	private flush(respond: (waitingResponse: WaitingResponse<T, E>) => void) {
		const waitingResponses = this.waitingResponses;
		this.waitingResponses = [];
		waitingResponses.forEach(respond);
	}
}
