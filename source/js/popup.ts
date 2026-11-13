'use popup';
import {start} from './components/popup/popup-starter';
import {attachPopupListener} from './components/popup/attachPopupListener';
import {triggerPromise} from './tools/triggerPromise';

((body) => {
	triggerPromise(start(body));
	attachPopupListener(body, window);
})(document.body);
