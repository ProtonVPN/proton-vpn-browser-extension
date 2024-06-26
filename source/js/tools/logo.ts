const config = {
	protected: {
		radialGradientOpacity: 1,
		linearGradient: {
			x1: 16.8924,
			y1: 16.0677,
			x2: 5.45846,
			y2: -3.49766,
			stops: [
				{offset: 0.0660125, color: '#8EFFEE'},
				{offset: 0.4499, color: '#C9C7FF'},
				{offset: 1, color: '#7341FF'},
			],
		},
	},
	unprotected: {
		radialGradientOpacity: 0,
		linearGradient: {
			x1: 13.7487,
			y1: 19.9831,
			x2: 0.435554,
			y2: -5.33997,
			stops: [
				{offset: 0.0660125, color: 'white'},
				{offset: 0.44988, color: '#A7A4B5'},
				{offset: 1, color: '#6D697D'},
			],
		},
	},
};

export const logo = {
	switchTo(state: keyof typeof config): void {
		const values = config[state];

		const radialGradient = document.getElementById('top-bar-inner-radial-gradient-path') as SVGLinearGradientElement | null;

		if (radialGradient) {
			radialGradient.style.opacity = `${values.radialGradientOpacity}`;
		}

		const gradient = document.getElementById('top-bar-outer-gradient') as SVGLinearGradientElement | null;

		if (!gradient) {
			return;
		}

		(['x1', 'y1', 'x2', 'y2'] as (keyof typeof values.linearGradient)[]).forEach(attribute => {
			gradient.setAttribute(attribute, `${values.linearGradient?.[attribute] as any}`);

			gradient.querySelectorAll('stop').forEach((stop, index) => {
				stop.setAttribute('offset', `${values.linearGradient?.stops?.[index]?.offset}`);
				stop.setAttribute('stop-color', `${values.linearGradient?.stops?.[index]?.color}`);
			});
		});
	},
};
