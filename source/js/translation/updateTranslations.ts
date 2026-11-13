import type {Node} from 'typescript';
import {
	createProgram,
	forEachChild,
	getLeadingCommentRanges,
	getTrailingCommentRanges,
	isCallExpression,
} from 'typescript';
import {glob} from 'glob';
import {parse} from 'node-html-parser';
import {readFile, realpathSync, writeFile} from 'fs';
import {addTranslation} from './addTranslation';
import {NamedImport, TypescriptParser} from 'typescript-parser';
import {getNodeText} from './getNodeText';
import {getTextNode} from './getTextNode';
import {ContextualizedTranslation} from './ContextualizedTranslation';
import type {Translation} from './Translation';
import {getKeys} from '../tools/getKeys';
import {generatePot} from './pot';

const outputData: Record<string, Record<string, Translation>> = {};

const compare = (a: string, b: string) => a.localeCompare(b);

const dumpPoFile = (): string => {
	const translations: Translation[] = [];

	getKeys(outputData)
		.sort(compare)
		.forEach((key) => {
			getKeys(outputData[key])
				.sort(compare)
				.forEach((id) => {
					translations.push(
						(outputData[key] as Record<string, Translation>)[id] as Translation,
					);
				});
		});

	return generatePot(translations);
};

const dumpJsonFile = (): string => {
	const contexts: Record<string, Record<string, string[]>> = {};

	getKeys(outputData)
		.sort(compare)
		.forEach((key) => {
			const translations: Record<string, string[]> = {};

			getKeys(outputData[key])
				.sort(compare)
				.forEach((id) => {
					translations[id] = (
						(outputData[key] as Record<string, Translation>)[id] as Translation
					).values;
				});

			contexts[key] = translations;
		});

	return JSON.stringify(
		{
			headers: {
				'plural-forms': 'nplurals=2; plural=(n != 1);',
				language: 'en_US',
			},
			contexts,
		},
		null,
		'\t',
	);
};

export const updateTranslations = (
	appDirectory: string | {ts: string; html: string},
	mode: string | undefined,
	callback?: typeof writeFile,
	filter?: (file: string) => boolean,
) => {
	filter ??= () => true;
	const directories =
		typeof appDirectory === 'string'
			? {ts: appDirectory, html: appDirectory}
			: appDirectory;

	return Promise.all([
		new Promise((globResolve) => {
			glob('**/*.html', {
				cwd: directories.html,
			})
				.then((files) => {
					Promise.all(
						files.filter(filter).map(
							(file) =>
								new Promise((fileResolve) => {
									readFile(directories.html + '/' + file, (err, content) => {
										if (err) {
											throw err;
										}

										const root = parse(content.toString());

										['aria-label', 'title'].forEach((attribute) => {
											root
												.querySelectorAll('[' + attribute + ']')
												.forEach((element) => {
													const attributeValue =
														element.getAttribute(attribute);

													if (attributeValue) {
														addTranslation(
															outputData,
															file,
															undefined,
															new ContextualizedTranslation(
																element.getAttribute('data-context') || 'Info',
																attributeValue,
																[attributeValue],
															),
															[element.getAttribute('data-comment')].filter(
																Boolean,
															) as string[],
														);
													}
												});
										});

										['svg > title', '[data-trans]'].forEach((selector) => {
											root.querySelectorAll(selector).forEach((element) => {
												const value = element.innerHTML
													.trim()
													.replace(/\n\t+/g, '\n');

												addTranslation(
													outputData,
													file,
													undefined,
													new ContextualizedTranslation(
														element.getAttribute('data-context') || 'Info',
														value,
														[value],
													),
													[element.getAttribute('data-comment')].filter(
														Boolean,
													) as string[],
												);
											});
										});

										root
											.querySelectorAll('[data-tooltip-title]')
											.forEach((element) => {
												const titles =
													element.getAttribute('data-tooltip-title');

												if (titles) {
													(
														Object.values(JSON.parse(titles)) as string[]
													).forEach((title) => {
														addTranslation(
															outputData,
															file,
															undefined,
															new ContextualizedTranslation(
																element.getAttribute('data-context') || 'Info',
																title,
																[title],
															),
															[element.getAttribute('data-comment')].filter(
																Boolean,
															) as string[],
														);
													});
												}
											});

										fileResolve(null);
									});
								}),
						),
					).then(() => {
						globResolve(null);
					});
				})
				.catch((error) => {
					throw error;
				});
		}),
		new Promise((globResolve) => {
			const parser = new TypescriptParser();
			const translatePath = realpathSync(
				directories.html + '/js/tools/translate.ts',
			).replace(/\.ts$/, '');

			glob('**/*.ts', {
				cwd: directories.ts,
			})
				.then((files) => {
					Promise.all(
						files.filter(filter).map(
							(filePath) =>
								new Promise((fileResolve) => {
									const fullPath = directories.ts + '/' + filePath;
									const baseDirectory = fullPath.replace(
										/([/\\])[^/\\]+$/,
										'$1',
									);
									const getImportPath = (libraryName: string) =>
										realpathSync(
											baseDirectory + libraryName.replace(/\.ts$/, '') + '.ts',
										).replace(/\.ts$/, '');
									parser
										.parseFile(fullPath, directories.ts + '/..')
										.then((file) => {
											let translateFunction: string | undefined = undefined;
											let contextFunction: string | undefined = undefined;

											file.imports.forEach((namedImport) => {
												if (
													namedImport instanceof NamedImport &&
													/\/translate(\.ts)?$/.test(namedImport.libraryName) &&
													getImportPath(namedImport.libraryName) ===
														translatePath
												) {
													namedImport.specifiers.forEach((specifier) => {
														if (specifier.specifier === 't') {
															translateFunction =
																specifier.alias || specifier.specifier;
														}

														if (specifier.specifier === 'c') {
															contextFunction =
																specifier.alias || specifier.specifier;
														}
													});
												}
											});

											if (translateFunction || contextFunction) {
												const program = createProgram([fullPath], {
													allowJs: true,
												});
												const sourceFile = program.getSourceFile(fullPath);

												if (!sourceFile) {
													throw new Error(
														'Source file not found for ' + fullPath,
													);
												}

												const fullText = sourceFile.getFullText();

												const scanNode = (
													node: Node,
													parentNodes: Node[] = [],
												) => {
													if (isCallExpression(node)) {
														const textNode = getTextNode(
															node,
															contextFunction,
															translateFunction,
															parentNodes,
															sourceFile,
														);

														if (textNode) {
															const text = getNodeText(
																textNode,
																sourceFile,
																filePath,
															);
															const referenceNode =
																textNode instanceof ContextualizedTranslation
																	? node
																	: textNode;
															const position =
																sourceFile.getLineAndCharacterOfPosition(
																	referenceNode.pos,
																);

															if (!text) {
																throw new Error(
																	'Only string literals statically analyzable are allowed in t()\n' +
																		'Wrong token found in:\n' +
																		realpathSync(fullPath) +
																		':' +
																		position.line +
																		':' +
																		position.character +
																		'\n' +
																		'Kind = ' +
																		(referenceNode?.kind || 'null'),
																);
															}

															addTranslation(
																outputData,
																filePath,
																position.line,
																text,
																[
																	...(getLeadingCommentRanges(
																		fullText,
																		node.getFullStart(),
																	)?.map((node) =>
																		fullText.substring(node.pos, node.end),
																	) || []),
																	...(getTrailingCommentRanges(
																		fullText,
																		node.getFullStart(),
																	)?.map((node) =>
																		fullText.substring(node.pos, node.end),
																	) || []),
																],
															);
														}
													}

													const parents = [node, ...parentNodes];

													node.forEachChild((subNode) => {
														scanNode(subNode, parents);
													});
												};

												forEachChild(sourceFile, (node) => {
													scanNode(node, []);
												});
											}

											fileResolve(null);
										});
								}),
						),
					).then(() => {
						globResolve(null);
					});
				})
				.catch((error) => {
					throw error;
				});
		}),
	]).then(() => {
		(callback || writeFile)(
			directories.html + '/locales/en_US.' + (mode || 'json'),
			mode === 'po' ? dumpPoFile() : dumpJsonFile(),
			(err) => {
				if (err) {
					throw err;
				}

				console.log('Translations updated');
			},
		);
	});
};
