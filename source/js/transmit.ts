import {getRuntime} from './tools/getRuntime';

((runtime) => {
	runtime.connect();

	window.addEventListener(
		'message',
		(event) => {
			if (event.source != window) {
				return;
			}

			runtime.sendMessage(event.data);
		},
		false,
	);
})(getRuntime());
