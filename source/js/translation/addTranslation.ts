import {ContextualizedTranslation} from './ContextualizedTranslation';
import {Translation} from './Translation';

export const addTranslation = (
	translations: Record<string, Record<string, Translation>>,
	file: string,
	line: number | undefined,
	text: ContextualizedTranslation,
	comments: string[] = [],
): void => {
	const id = text.key.replace(/\n(\t+)/g, '\n').trim();

	(translations[text.context] || (translations[text.context] = {}))[id] = {
		key: text.key.trim(),
		context: text.context,
		file,
		line,
		values: text.values.map(
			value => value.replace(/\n(\t+)/g, '\n').trim(),
		),
		comments,
	};
};
