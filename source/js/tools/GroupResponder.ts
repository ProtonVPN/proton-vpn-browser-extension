type Responder<R, E = object | string> = [
	(result: R) => void,
	(error: E) => void,
];

export class GroupResponder<R, E = object | string> {
	private refreshing = false;
	private waitingPromises: Responder<R, E>[] = [];

	async handle(callback: () => Promise<R>): Promise<R> {
		if (this.refreshing) {
			return await new Promise((resolve, reject) => {
				this.waitingPromises.push([resolve, reject]);
			});
		}

		this.refreshing = true;

		try {
			const result = await callback();
			this.resolve(result);

			return result;
		} catch (error) {
			this.reject(error as E);

			throw error;
		} finally {
			this.refreshing = false;
		}
	}

	respond(callback: (handler: Responder<R, E>) => void) {
		this.waitingPromises.forEach(callback);
		this.waitingPromises = [];
	}

	resolve(result: R) {
		this.respond(([resolve]) => {
			resolve(result);
		});
	}

	reject(error: E) {
		this.respond(([, reject]) => {
			reject(error);
		});
	}
}
