import {isTaggedTemplateExpression, SourceFile} from 'typescript';
import {isTranslatableString} from './isTranslatableString';
import {ContextualizedTranslation} from './ContextualizedTranslation';

export const getNodeText = (textNode: any, sourceFile?: SourceFile, context = 'messages'): ContextualizedTranslation | undefined => {
	if (!textNode) {
		return undefined;
	}

	if (textNode instanceof ContextualizedTranslation) {
		return textNode;
	}

	if (!isTranslatableString(textNode)) {
		return undefined;
	}

	let text = textNode.getText(sourceFile);

	if (!text) {
		return undefined;
	}

	if (isTaggedTemplateExpression(textNode)) {
		text = text.replace(new RegExp('^' + textNode.tag.getText(sourceFile)), '');
	}

	switch (text.charAt(0)) {
		case '`':
		case "'":
		case '"':
			text = text.substring(1, text.length - 1)
				.replace(/\\n/g, '\n')
				.replace(/\\([\\'"`])/g, '$1');
	}

	return new ContextualizedTranslation(context, text, [text]);
};
