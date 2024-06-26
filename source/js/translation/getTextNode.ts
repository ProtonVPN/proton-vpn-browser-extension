import {
	CallExpression,
	Expression,
	isCallExpression,
	isIdentifier,
	isPropertyAccessExpression,
	isTaggedTemplateExpression,
	Node,
	SourceFile
} from 'typescript';
import {getNodeText} from './getNodeText';
import {ContextualizedTranslation} from './ContextualizedTranslation';

export const getTextNode = (
	node: CallExpression,
	contextFunction: string | undefined,
	translateFunction: string | undefined,
	parentNodes: Node[] = [],
	sourceFile?: SourceFile,
): Expression | ContextualizedTranslation | undefined => {
	const textNode = node.arguments[0] || undefined;
	const functionName = isIdentifier(node.expression) ? node.expression.escapedText : undefined;

	if (!functionName) {
		return undefined;
	}

	switch (functionName) {
		case contextFunction:
			const context = getNodeText(textNode, sourceFile)?.key;

			if (context && parentNodes[0] && isPropertyAccessExpression(parentNodes[0])) {
				switch (parentNodes[0].name.getText(sourceFile)) {
					case 't':
						if (parentNodes[1] && isTaggedTemplateExpression(parentNodes[1])) {
							const children = parentNodes[1].getChildren(sourceFile);

							if (children.length === 2) {
								return getNodeText(children[1] as any, sourceFile, context);
							}
						}

						break;

					case 'plural':
						if (parentNodes[1] && isCallExpression(parentNodes[1])) {
							const texts = parentNodes[1]
								.getChildAt(2, sourceFile)
								.getChildren(sourceFile)
								.filter(node => node.kind !== 27)
								.slice(1)
								.map(n => getNodeText(n, sourceFile)?.key)
								.filter((text): text is string => typeof text === 'string');

							if (texts[0]) {
								return new ContextualizedTranslation(
									context,
									texts[0],
									texts,
								);
							}
						}

						break;
				}
			}

			return undefined;

		case translateFunction:
			return textNode;
	}

	return undefined;
};
