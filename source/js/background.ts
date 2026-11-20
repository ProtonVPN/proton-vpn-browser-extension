'use background';
import {setupHandleProxyRequest} from './tools/setupHandleProxyRequest';
import {fetchTranslations} from './tools/translate';
import {triggerPromise} from './tools/triggerPromise';
import {initPostInstallationHook} from './vpn/initPostInstallationHook';
import {initMessaging} from './vpn/initMessaging';
import {initState} from './vpn/initState';
import {initFocusWatcher} from './vpn/initFocusWatcher';
import {initProxySettingsWatcher} from './vpn/proxy/initProxySettingsWatcher';
import {initIdleWatcher} from './vpn/initIdleWatcher';
import {initAuthInterceptor} from './vpn/initAuthInterceptor';
import {detectCensorship} from './vpn/detectCensorship';
import {initPageNetworkErrorWatcher} from './vpn/initPageNetworkErrorWatcher';
import {initSentry} from './tools/sentry';
import {setProxyToWaiterHost} from './tools/proxy';
import {usesFirefoxProxySettings} from './vpn/proxy/usesFirefoxProxySettings';
import {initPrivateWindowsNotification} from './vpn/privateWindows/initPrivateWindowsNotification';
import {initFingerprintProtection} from './fingerprint/initFingerprintProtection';

// In Firefox, proxy.onRequest holds requests until the state is restored
// (see setupHandleProxyRequest), a dead-end would make them fail instead
if (!usesFirefoxProxySettings()) {
	triggerPromise(setProxyToWaiterHost());
}

initSentry();
initAuthInterceptor();
initMessaging();
setTimeout(initState, 1);
setupHandleProxyRequest();
const translationsLoaded = fetchTranslations();
triggerPromise(translationsLoaded);
initPrivateWindowsNotification(translationsLoaded);
initPostInstallationHook();
initFocusWatcher();
initProxySettingsWatcher();
initIdleWatcher();
initPageNetworkErrorWatcher();
detectCensorship();
initFingerprintProtection();
