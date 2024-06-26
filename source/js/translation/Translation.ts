export interface Translation {
	file: string;
	line?: number;
	key: string;
	context: string;
	values: string[];
	comments: string[];
}
