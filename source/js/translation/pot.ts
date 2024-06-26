import {Translation} from './Translation';

const formatString = (text: string): string => text
	.replace(/\\/g, '\\\\')
	.replace(/"/g, '\\"')
	.replace(/\n/g, "\\n\"\n  \"");

const cleanComment = (comment: string) => {
	if (comment.substring(0, 2) === '//') {
		return `#. ${comment.replace(/^\/\/\s?/, '')}\n`;
	}

	comment = comment
		.replace(/^\/\*+\n/, '')
		.replace(/[\n\r]+[\t ]*\*+\/\s*$/, '')
		.replace(/^\s*\/\*+\s(.*)\s\*+\/\s*$/, '$1');
	const match = comment.match(/^(\s*\*)?\s+/);
	let lines = comment.split('\n');

	if (match && match[0]) {
		const length = match[0].length;
		lines = lines.map(line => line.substring(0, length) === match[0] ? line.substring(length) : line);
	}

	return lines.map(line => `#. ${line}\n`).join('');
};

const formatTranslation = (translation: Translation) => translation.comments.map(cleanComment).join('') +
`#: ${translation.file}${translation.line ? ':' + translation.line : ''}
msgctxt "${formatString(translation.context)}"
msgid "${formatString(translation.key)}"
${translation.values.length === 2
	? `msgid_plural "${formatString(translation.values[1] as string)}"
msgstr[0] ""
msgstr[1] ""`
	: `msgstr ""`
}

`;

export const generatePot = (
	translations: Translation[],
	locale = 'en_US',
	plural = 'nplurals=2; plural=(n != 1);',
) => `#
msgid ""
msgstr ""
"Project-Id-Version: ProtonTech API\\n"
"POT-Creation-Date: ${new Date()
	.toISOString()
	.replace('T', ' ')
	.replace(/:\d+\.\d+Z$/, '')
}+0000\\n"
"Language-Team: ProtonMail <contact@protonmail.ch>\\n"
"Language: ${locale}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"X-Generator: ProtonTranslator 1.1.0\\n"
"Plural-Forms: ${plural}\\n"
"X-Poedit-SourceCharset: UTF-8\\n"

${translations.map(formatTranslation).join('')}`;
