import {normalize} from './normalize';

export const getSearchWordsScore = (words: string[], contents: string[]): number => {
	return contents.reduce((score, content) => {
		content = normalize(content);

		return score + words.reduce(
			(innerScore, word) => innerScore + (content === word ? 3 : content.startsWith(word) ? (
				word.length > 4
					? 2
					: (words.length !== 1 && word.length === 1 ? 0.4 : 1)
			) : 0),
			0,
		);
	}, 0);
};
