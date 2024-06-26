export class ContextualizedTranslation {
	constructor(
		public readonly context: string,
		public readonly key: string,
		public readonly values: string[],
	) {
	}
}
