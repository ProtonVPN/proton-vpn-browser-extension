import type {
	NoSubstitutionTemplateLiteral,
	StringLiteral,
	TaggedTemplateExpression,
	TemplateExpression,
} from 'typescript';
import {
	isNoSubstitutionTemplateLiteral,
	isStringLiteral,
	isTaggedTemplateExpression,
	isTemplateExpression,
} from 'typescript';

export const isTranslatableString = (
	value: any,
): value is
	| StringLiteral
	| TemplateExpression
	| TaggedTemplateExpression
	| NoSubstitutionTemplateLiteral =>
	value &&
	(isTemplateExpression(value) ||
		isTaggedTemplateExpression(value) ||
		isStringLiteral(value) ||
		isNoSubstitutionTemplateLiteral(value));
