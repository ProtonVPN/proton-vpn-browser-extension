import {setupHandleProxyRequest} from './tools/setupHandleProxyRequest';
import {fetchTranslations} from './tools/translate';
import {triggerPromise} from './tools/triggerPromise';
import {backgroundOnly} from './context/backgroundOnly';
import {initOnboarding} from './vpn/initOnboarding';
import {initMessaging} from './vpn/initMessaging';
import {initState} from './vpn/initState';
import {initFocusWatcher} from './vpn/initFocusWatcher';
import {initProxySettingsWatcher} from './vpn/initProxySettingsWatcher';
import {initIdleWatcher} from './vpn/initIdleWatcher';
import {initAuthInterceptor} from './vpn/initAuthInterceptor';
import {initSentry} from './tools/sentry';
import {setProxyToWaiterHost} from './tools/proxy';

backgroundOnly('background');

setProxyToWaiterHost();
initSentry();
initAuthInterceptor();
initMessaging();
setTimeout(initState, 1);
setupHandleProxyRequest();
triggerPromise(fetchTranslations());
initOnboarding();
initFocusWatcher();
initProxySettingsWatcher();
initIdleWatcher();
