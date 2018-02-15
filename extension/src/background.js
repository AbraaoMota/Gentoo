
alert("BACKGROUND");

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    alert("Logging");
    var antiXSSAuditor = {
      name: "X-XSS-Protection",
      value: 0
    };
    var downGradeInsecureRequests = {
      name: "Upgrade-Insecure-Requests",
      value: 0
    };

    details.requestHeaders.push(downGradeInsecureRequests);
    details.requestHeaders.push(antiXSSAuditor);
    console.log(details.requestHeaders);
    // return { details.requestHeaders };
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
