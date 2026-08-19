import {getRuntime} from './tools/getRuntime';
import {relayMessagesToExtension} from './tools/relayMessagesToExtension';

relayMessagesToExtension(window, getRuntime());
