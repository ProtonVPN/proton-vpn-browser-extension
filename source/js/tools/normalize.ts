const removeAccents = (text: string): string => {
	try {
		return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	} catch (e) {
		return text
			.replace(/[àáâãäå]/g, 'a')
			.replace(/æ/g, 'ae')
			.replace(/ç/g, 'c')
			.replace(/[èéêë]/g, 'e')
			.replace(/[ìíîï]/g, 'i')
			.replace(/ñ/g, 'n')
			.replace(/[òóôõö]/g, 'o')
			.replace(/œ/g, 'oe')
			.replace(/[ùúûü]/g, 'u')
			.replace(/[ýÿ]/g, 'y')
		;
	}
};

export const normalize = (text: string): string => {
	text = text.toLowerCase().replace(/\s/g, '');

	try {
		text = removeAccents(text);
	} catch (e) {
	}

	return text;
};
