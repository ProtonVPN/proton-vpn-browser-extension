import {normalize} from './normalize';

export const getWords = (sentence: string | null | undefined) => sentence
	? sentence.split(/[,;()\s--]+/).map(normalize).filter(Boolean)
	: [];
