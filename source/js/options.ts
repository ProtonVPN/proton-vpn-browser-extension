import optionsStorage from './options-storage';

void optionsStorage.syncForm('#options-form');

const rangeInputs = [...document.querySelectorAll<HTMLInputElement>('input[type="range"][name^="color"]')];
const numberInputs = [...document.querySelectorAll<HTMLInputElement>('input[type="number"][name^="color"]')];
const output = document.querySelector<HTMLElement>('.color-output');

function updateColor(): void {
	if (output && rangeInputs.length >= 3) {
		output.style.backgroundColor = `rgb(${rangeInputs[0]?.value}, ${rangeInputs[1]?.value}, ${rangeInputs[2]?.value})`;
	}
}

function updateInputField(event: Event): void {
	const target = event.currentTarget as HTMLInputElement;
	const numberInput = numberInputs?.[rangeInputs.indexOf(target)];

	if (numberInput) {
		numberInput.value = target?.value;
	}
}

for (const input of rangeInputs) {
	input.addEventListener('input', updateColor);
	input.addEventListener('input', updateInputField);
}

window.addEventListener('load', updateColor);
