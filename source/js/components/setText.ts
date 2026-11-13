'use popup';
import {escapeHtml} from '../tools/escapeHtml';

export const setText = (element: HTMLElement, text: string) => {
	// nosemgrep:insecure-innerhtml
	element.innerHTML = escapeHtml(text);
};
