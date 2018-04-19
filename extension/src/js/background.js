function extractParams(query) {
  var result = {};
  query.split("&").forEach(function(part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg === "reflectedXSS") {
      // Warn the user that a reflected XSS URL has been found
      // by displaying a badge
      chrome.browserAction.setBadgeText({ text: "!" });
      chrome.browserAction.setBadgeBackgroundColor({ color: "red" });
    }
  }
);

chrome.runtime.onConnect.addListener(
  function(devToolsConnection) {
    // assign the listener function to a variable so we can remove it later
    var devToolsListener = function(message, sender, sendResponse) {
      // Send a message to the action replay script
      chrome.tabs.sendMessage({
        reqCookies:  message.reqCookies,
        reqHeaders:  message.reqHeaders,
        reqParams:   message.reqParams,
        respCookies: message.respCookies,
        respHeaders: message.respHeaders
      });
    };

    // Add the listener
    devToolsConnection.onMessage.addListener(devToolsListener);

    // Remove listener once finished
    devToolsConnection.onDisconnect.addListener(function() {
      devToolsConnection.onMessage.removeListener(devToolsListener);
    });
  }
)

chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    // Initiator is the root URL that we are looking at
    var initiator = details.initiator;
    var url = details.url;

    var urlParams = {}
    // String comparison not the same - will very likely happen if we are not at a homepage
    if (initiator !== url) {
      // Analyse for URL parameters
      var paramIndex = url.indexOf("?");

      // We have url params
      if (paramIndex >= 0) {
        urlParams = (extractParams(url.slice(paramIndex + 1)));
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {

    // ***********************
    // REQUESTS
    // ***********************

    var overrideRequestList = [
      // { name: "X-XSS-Protection",          value: "0" },
      // { name: "Upgrade-Insecure-Requests", value: "0" }
    ];

    // Find any conflicting headers and remove them
    // console.log(details.requestHeaders);
    for (i = 0; i < details.requestHeaders.length; i++) {
      for (j = 0; j < overrideRequestList.length; j++) {
        if (details.requestHeaders[i].name == overrideRequestList[j].name) {
          details.requestHeaders.splice(i, 1);
        }
      }
    }

    // Add in all new headers
    for (i = 0; i < overrideRequestList.length; i++) {
      details.requestHeaders.push(overrideRequestList[i]);
    }
    // ************************
    // RESPONSES
    // ************************
    // console.log(details.requestHeaders);
    // return { details.requestHeaders };
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
