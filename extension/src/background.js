console.log(chrome.webRequest.HttpHeaders);

chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    // alert("ON SEND HEADERS");
    console.log("HENLO ON SEND HEADERS");
    console.log(details.requestHeaders);
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]
);


chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {

    // alert("BEFORE SENDING HEADERS");
    // ***********************
    // REQUESTS
    // ***********************

    var overrideRequestList = [
      { name: "X-XSS-Protection",          value: "0" },
      { name: "Upgrade-Insecure-Requests", value: "0" }
    ];

    // Find any conflicting headers and remove them
    console.log(details.requestHeaders);
    for (i = 0; i < details.requestHeaders.length; i++) {
      for (j = 0; j < overridesList.length; j++) {
        if (details.requestHeaders[i].name == overrideRequestList[j].name) {
          details.requestHeaders.splice(i, 1);
        }
      }
    }

    // Add in all new headers
    for (i = 0; i < overridesList.length; i++) {
      details.requestHeaders.push(overridesList[i]);
    }


    // ************************
    // RESPONSES
    // ************************
    console.log(details.requestHeaders);
    // return { details.requestHeaders };
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
