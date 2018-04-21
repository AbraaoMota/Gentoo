// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
  name: "devtools-page"
});

backgroundPageConnection.onMessage.addListener(function (message) {
  // Handle responses from the background page, if any
});

// Relay the tab ID to the background page
chrome.runtime.sendMessage({
  tabId: chrome.devtools.inspectedWindow.tabId,
  scriptToInject: "action_replay.js"
});

// In order for this to work as intended, the devtools page has to
// be open in the background so that these parameters can be sent
// after every request
chrome.devtools.network.onRequestFinished.addListener(
  function(r) {
    var request = r.request;
    var response = r.response;

    // var requestCookies = request.cookies;
    // var requestHeaders = request.headers;
    // var requestQueryParameters = request.queryString;

    // var responseCookies = response.cookies;
    // var responseHeaders = response.headers;


    var backgroundPageConnection = chrome.runtime.connect({
      name: "devTools"
    });

    console.log("WE'RE SENDING A MESSAGE FROM DEV TOOLS TO BACKGROUND");
    backgroundPageConnection.postMessage({
    // chrome.runtime.sendMessage({
      name:        "devToolsParams",
      tabId:       chrome.devtools.inspectedWindow.tabId,
      reqCookies:  request.cookies,
      reqHeaders:  request.headers,
      reqParams:   request.queryString,
      respCookies: response.cookies,
      respHeaders: response.headers
    });
  }
);
