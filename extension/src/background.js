
alert("BACKGROUND");

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    var overridesList = [
      { name: "X-XSS-Protection",          value: "0" },
      { name: "Upgrade-Insecure-Requests", value: "0" }
    ];

    // Find any conflicting headers and remove them
    console.log(details.requestHeaders);
    for (i = 0; i < details.requestHeaders.length; i++) {
      for (j = 0; j < overridesList.length; j++) {
        if (details.requestHeaders[i].name == overridesList[j].name) {
          details.requestHeaders.splice(i, 1);
        }
      }
    }

    // Add in all new headers
    for (i = 0; i < overridesList.length; i++) {
      details.requestHeaders.push(overridesList[i]);
    }

    console.log(details.requestHeaders);
    // return { details.requestHeaders };
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
