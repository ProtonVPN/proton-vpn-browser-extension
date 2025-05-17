import {
	createProgram,
	forEachChild,
	getLeadingCommentRanges,
	getTrailingCommentRanges,
	isCallExpression,
	Node,
} from 'typescript';
import {glob} from 'glob';
import {parse} from 'node-html-parser';
import {readFile, realpathSync, writeFile} from 'fs';
import {addTranslation} from './addTranslation';
import {NamedImport, TypescriptParser} from 'typescript-parser';
import {getNodeText} from './getNodeText';
import {getTextNode} from './getTextNode';
import {ContextualizedTranslation} from './ContextualizedTranslation';
import {Translation} from './Translation';
import {getKeys} from '../tools/getKeys';
import {generatePot} from './pot';

const appDirectory = __dirname + '/../..';

const outputData: Record<string, Record<string, Translation>> = {};

const extractFile = process.argv.find(arg => /[/\\]extract\.ts$/.test(arg));
const [mode] = process.argv.slice(extractFile ? process.argv.indexOf(extractFile) + 1 : 2);

const compare = (a: string, b: string) => a.localeCompare(b);

const dumpFile = (): string => {
	if (mode === 'po') {
		const translations: Translation[] = [];

		getKeys(outputData).sort(compare).forEach(key => {
			getKeys(outputData[key]).sort(compare).forEach(id => {
				translations.push((outputData[key] as Record<string, Translation>)[id] as Translation);
			});
		});

		return generatePot(translations);
	}

	const contexts: Record<string, Record<string, string[]>> = {};

	getKeys(outputData).sort(compare).forEach(key => {
		const translations: Record<string, string[]> = {}

		getKeys(outputData[key]).sort(compare).forEach(id => {
			translations[id] = ((outputData[key] as Record<string, Translation>)[id] as Translation).values;
		});

		contexts[key] = translations;
	});

	return JSON.stringify({
		headers: {
			'plural-forms': 'nplurals=2; plural=(n != 1);',
			'language': 'en_US',
		},
		contexts,
	}, null, '\t');
};

Promise.all([
	new Promise(globResolve => {
		glob('**/*.html', {
			cwd: appDirectory,
		}).then(files => {
			Promise.all(files.map(file => new Promise(fileResolve => {
				readFile(appDirectory + '/' + file, (err, content) => {
					if (err) {
						throw err;
					}

					const root = parse(content.toString());

					['aria-label', 'title'].forEach(attribute => {
						root.querySelectorAll('[' + attribute + ']').forEach(element => {
							const attributeValue = element.getAttribute(attribute);

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
									[element.getAttribute('data-comment')].filter(Boolean) as string[],
								);
							}
						});
					});

					['svg > title', '[data-trans]'].forEach(selector => {
						root.querySelectorAll(selector).forEach(element => {
							const value = element.innerHTML.trim().replace(/\n\t+/g, '\n');

							addTranslation(
								outputData,
								file,
								undefined,
								new ContextualizedTranslation(
									element.getAttribute('data-context') || 'Info',
									value,
									[value],
								),
								[element.getAttribute('data-comment')].filter(Boolean) as string[],
							);
						});
					});

					fileResolve(null);
				});
			}))).then(() => {
				globResolve(null)
			});
		}).catch(error => {
			throw error;
		});;
	}),
	new Promise(globResolve => {
		const parser = new TypescriptParser();
		const translatePath = realpathSync(appDirectory + '/js/tools/translate.ts').replace(/\.ts$/, '');

		glob('**/*.ts', {
			cwd: appDirectory,
		}).then(files => {
			Promise.all(files.map(filePath => new Promise(fileResolve => {
				const fullPath = appDirectory + '/' + filePath;
				const baseDirectory = fullPath.replace(/([\/\\])[^\/\\]+$/, '$1');
				const getImportPath = (libraryName: string) => realpathSync(
					baseDirectory + libraryName.replace(/\.ts$/, '') + '.ts',
				).replace(/\.ts$/, '')
				parser.parseFile(fullPath, appDirectory + '/..').then(file => {
					let translateFunction: string | undefined = undefined;
					let contextFunction: string | undefined = undefined;

					file.imports.forEach(namedImport => {
						if (namedImport instanceof NamedImport &&
							/\/translate(\.ts)?$/.test(namedImport.libraryName) &&
							getImportPath(namedImport.libraryName) === translatePath
						) {
							namedImport.specifiers.forEach(specifier => {
								if (specifier.specifier === 't') {
									translateFunction = specifier.alias || specifier.specifier;
								}

								if (specifier.specifier === 'c') {
									contextFunction = specifier.alias || specifier.specifier;
								}
							});
						}
					});

					if (translateFunction || contextFunction) {
						const program = createProgram([fullPath], {allowJs: true});
						const sourceFile = program.getSourceFile(fullPath);

						if (!sourceFile) {
							throw new Error('Source file not found for ' + fullPath);
						}

						const fullText = sourceFile.getFullText();

						const scanNode = (node: Node, parentNodes: Node[] = []) => {
							if (isCallExpression(node)) {
								const textNode = getTextNode(
									node,
									contextFunction,
									translateFunction,
									parentNodes,
									sourceFile,
								);

								if (textNode) {
									const text = getNodeText(textNode, sourceFile, filePath);
									const referenceNode = textNode instanceof ContextualizedTranslation
										? node
										: textNode;
									const position = sourceFile.getLineAndCharacterOfPosition(referenceNode.pos);

									if (!text) {
										throw new Error(
											'Only string literals statically analyzable are allowed in t()\n' +
											'Wrong token found in:\n' + realpathSync(fullPath) + ':' +
											position.line + ':' + position.character + '\n' +
											'Kind = ' + (referenceNode?.kind || 'null'),
										);
									}

									addTranslation(
										outputData,
										filePath,
										position.line,
										text,
										[
											...getLeadingCommentRanges(fullText, node.getFullStart())?.map(
												node => fullText.substring(node.pos, node.end),
											) || [],
											...getTrailingCommentRanges(fullText, node.getFullStart())?.map(
												node => fullText.substring(node.pos, node.end),
											) || [],
										]
									);
								}
							}

							const parents = [node, ...parentNodes];

							node.forEachChild(subNode => {
								scanNode(subNode, parents);
							});
						};

						forEachChild(sourceFile, node => {
							scanNode(node, []);
						});
					}

					fileResolve(null);
				})
			}))).then(() => {
				globResolve(null)
			});
		}).catch(error => {
			throw error;
		});
	}),
]).then(() => {
	writeFile(appDirectory + '/locales/en_US.' + (mode || 'json'), dumpFile(), err => {
		if (err) {
			throw err;
		}

		console.log('Translations updated');
	});
});
