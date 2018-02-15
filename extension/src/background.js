
alert("BACKGROUND");

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    var overridesList = [
      { name: "X-XSS-Protection",          value: "0"},
      { name: "Upgrade-Insecure-Requests", value: "0"}
    ];


    // Find any conflicting headers and remove them
    for (int i = 0; i < details.requestHeaders.length; i++) {
      for (int j = 0; j < overridesList.length; j++) {
        if (details.requestHeaders[i].name == overridesList[j].name) {
          details.requestHeaders.splice(i, 1);
        }
      }
    }

    // Add in all new headers
    for (int i = 0; i < overridesList.length; i++) {
      details.requestHeaders.push(overridesList[i]);
    }

//     details.requestHeaders.push(downGradeInsecureRequests);
//     details.requestHeaders.push(antiXSSAuditor);
    console.log(details.requestHeaders);
    // return { details.requestHeaders };
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
