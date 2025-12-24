export const makeResponseReplayable = (response: Response): Response => {
	const copy = response.clone();

	copy.text().then(text => {
		let json: any;

		Object.assign(copy, {
			clone: () => copy,

			async text() {
				return text;
			},

			async json() {
				if (typeof json === 'undefined') {
					json = JSON.parse(text);
				}

				return json;
			},
		});
	});

	return copy;
};
