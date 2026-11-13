import {updateTranslations} from './updateTranslations';

const extractFile = process.argv.find((arg) => /[/\\]extract\.ts$/.test(arg));
const [mode] = process.argv.slice(
	extractFile ? process.argv.indexOf(extractFile) + 1 : 2,
);

void updateTranslations(__dirname + '/../..', mode);
