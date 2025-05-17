import {requestMaxAge} from '../config';
import WebResponseHeadersDetails = chrome.webRequest.WebResponseHeadersDetails;
import BlockingResponse = chrome.webRequest.BlockingResponse;

export const headerHandler = (requestDetails: WebResponseHeadersDetails): BlockingResponse | void => {
	if (!requestDetails.responseHeaders) {
		return {};
	}

	return {
		responseHeaders: requestDetails.responseHeaders.map(header => {
			// Reduce the maximum max-age so preflight requests won't be held and send later when
			// token is already expired
			if (header.name.toLowerCase() === 'access-control-max-age' && Number(header.value || 0) > requestMaxAge) {
				header.value = `${requestMaxAge}`;
			}

			return header;
		}),
	};
};
