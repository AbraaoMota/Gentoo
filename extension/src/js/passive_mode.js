// Message handling logic - contains a flag to synchronously process messages
// to avoid async DB overwrites
var passiveMessageHandlerBusy = false;
var passiveMessageHandler = function(message, sender, sendResponse) {

  if (passiveMessageHandlerBusy) {
    window.setTimeout(function() {
      passiveMessageHandler(message, sender, sendResponse);
    }, 0);
    return;
  }

  passiveMessageHandlerBusy = true;

  chrome.storage.local.get(function(storage) {
    var enablePassiveMode = storage["enablePassiveMode"];

    if (message.name === "devToolsParams" && enablePassiveMode) {
      storePassiveRequests(storage, message);
      runPassiveAnalysis(message);
      passiveMessageHandlerBusy = false;
    }
  });

  // return true;
}
// Listen for messages
chrome.runtime.onMessage.addListener(passiveMessageHandler);

// Log any requests and responses for analysis
function storePassiveRequests(storage, message) {

  var passiveModeRequests = storage["passiveModeRequests"];
  if (!passiveModeRequests) {
    passiveModeRequests = [];
  }

  var passiveModeEnabled = storage["enablePassiveMode"];
  if (passiveModeEnabled) {
    passiveModeRequests.push({
      url:         message.url,
      reqCookies:  message.reqCookies,
      reqHeaders:  message.reqHeaders,
      reqParams:   message.reqParams,
      respCookies: message.respCookies,
      respHeaders: message.respHeaders,
      respContent: message.respContent
    });

    chrome.storage.local.set({ "passiveModeRequests": passiveModeRequests });
  }
}

// Passive Analysis algorithm
function runPassiveAnalysis(r) {

  // We only want to analyse "text/html" type requests for now
  var contentTypeIndex = headerIndex(r, "respHeaders", "Content-type");

  if (contentTypeIndex >= 0 && r["respHeaders"][contentTypeIndex].value.includes("text/html")) {
    console.log("ANALYSING HEADERS FOR A REQUEST");
    analyseRequestHeaders(r);
  }
}

// Function that checks for weak header settings
function analyseRequestHeaders(r) {

  var secureHeaders = {
    "Content-Security-Policy":   "",
    "Referrer-Policy":           "",
    "Strict-Transport-Security": "",
    "X-Content-Type-Options":    "",
    "X-Frame-Options":           "",
    "X-XSS-Protection":          ""
  }

  var reqHeaders = r.reqHeaders;
  var respHeaders = r.respHeaders;
  var allHeaders = reqHeaders.concat(respHeaders);

  // Loop over all headers in the request, if they match
  // any in the secure headers, keep their value
  for (var i = 0; i < allHeaders.length; i++) {
    var headerName = allHeaders[i]["name"];
    var headerValue = allHeaders[i]["value"];

    if (Object.keys(secureHeaders).indexOf(headerName) >= 0) {
      // Current header is a secure header
      secureHeaders[headerName] = headerValue;
    }
  }

  var warnings = [];

  var secureHeaderKeys = Object.keys(secureHeaders);
  // Loop over security header values and produce appropriate response
  for (var j = 0; j < secureHeaderKeys.length; j++) {
    var header = secureHeaderKeys[j];
    var value = secureHeaders[header];

    switch (header) {
      case "Content-Security-Policy":
        if (value === "") {
          warnings.push("The Content-Security-Policy header is not set. This may result in malicious assets being loaded.");
        }
        break;

      case "Referrer-Policy":
        if (value === "") {
          warnings.push("The Referrer-Policy header is not set. This controls how much information is given by the site on navigation away from it.");
        }

        break;

      case "Strict-Transport-Security":
        if (value === "") {
          warnings.push("The Strict-Transport-Security header is not set. Setting it strengthens the TLS implementation by enforcing the User Agent to use HTTPS.");
        }


        break;

      case "X-Content-Type-Options":
        if (value === "") {
          warnings.push("The X-Content-Type-Options header is not set. Setting it to \"nosniff\" prevents any MIME type sniffing attacks.");
        }

        break;

      case "X-Frame-Options":
        if (value === "") {
          warnings.push("The X-Frame-Options header is not set. Setting it can prevent clickjacking attacks by rendering the site in external frames. Recommended value is: \"SAMEORIGIN\".");
        }

        break;

      case "X-XSS-Protection":
        if (value === "") {
          warnings.push("The X-XSS-Protection header is not set. Setting it to \"1;mode=block\" will prevent the page from loading on some browsers if reflected XSS is detected.");
        }

        break;
    } // end switch
  } // end header loop

  // Proceed no further if no warnings for this request
  if (warnings.length === 0) {
    return;
  }

  console.log("WE'VE GOT A REQUEST WITH WARNINGS");

  // Attach warnings to request
  r["warnings"] = warnings;

  // Store requests with weak headers
  chrome.storage.local.get(function(storage) {
    var passiveModeWeakHeaderRequests = storage["passiveModeWeakHeaderRequests"];
    if (!passiveModeWeakHeaderRequests) {
      passiveModeWeakHeaderRequests = [];
    }

    passiveModeWeakHeaderRequests.push(r);

    chrome.storage.local.set({ "passiveModeWeakHeaderRequests": passiveModeWeakHeaderRequests });

    // Send warning to extension to display weak requests
    sendWeakRequestWarning(passiveModeWeakHeaderRequests);
  });

  }

// Function to warn popup page about requests with weak headers
function sendWeakRequestWarning(passiveModeWeakHeaderRequests) {
  chrome.runtime.sendMessage({
    msg: "weakHeaderRequest",
    data: {
      subject: "These requests have weak security header settings",
      content: passiveModeWeakHeaderRequests
    }
  });
}
