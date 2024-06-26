export const escapeHtml = (text: string) => text
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;')
	.replace(/\//g, '&#47;');
