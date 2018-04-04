// console.log(chrome.webRequest);

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
    console.log("Received msg in background");
    if (request.msg === "reflectedXSS") {
      alert("Received msg in background");
      console.log(request.data.subject)
      console.log(request.data.content)
    }
  }
);

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
