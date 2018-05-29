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
    "content-security-policy":   "",
    "referrer-policy":           "",
    "strict-transport-security": "",
    "x-content-type-options":    "",
    "x-frame-options":           "",
    "x-xss-protection":          ""
  }

  var reqHeaders = r.reqHeaders;
  var respHeaders = r.respHeaders;
  var allHeaders = reqHeaders.concat(respHeaders);

  // Loop over all headers in the request, if they match
  // any in the secure headers, keep their value
  for (var i = 0; i < allHeaders.length; i++) {
    var headerName = allHeaders[i]["name"].toLowerCase();
    var headerValue = allHeaders[i]["value"];

    if (Object.keys(secureHeaders).indexOf(headerName) >= 0) {
      // Current header is a secure header
      secureHeaders[headerName] = headerValue;
    }
  }

  var warnings = [];

  console.log("THESE ARE THE SECURE HEADERS");
  console.log(secureHeaders);
  var secureHeaderKeys = Object.keys(secureHeaders);
  // Loop over security header values and produce appropriate response
  for (var j = 0; j < secureHeaderKeys.length; j++) {
    var header = secureHeaderKeys[j];
    var value = secureHeaders[header];

    switch (header) {
      case "content-security-policy":
        if (value === "") {
          warnings.push("The <b>Content-Security-Policy</b> header is not set. This may result in malicious assets being loaded.");
        }
        break;

      case "referrer-policy":
        if (value === "") {
          warnings.push("The <b>Referrer-Policy</b> header is not set. This controls how much information is given by the site on navigation away from it.");
        }

        break;

      case "strict-transport-security":
        if (value === "") {
          warnings.push("The <b>Strict-Transport-Security</b> header is not set. Setting it strengthens the TLS implementation by enforcing the User Agent to use HTTPS.");
        }


        break;

      case "x-content-type-options":
        if (value === "") {
          warnings.push("The <b>X-Content-Type-Options</b> header is not set. Setting it to <b>\"nosniff\"</b> prevents any MIME type sniffing attacks.");
        }

        break;

      case "x-frame-options":
        if (value === "") {
          warnings.push("The <b>X-Frame-Options</b> header is not set. Setting it can prevent clickjacking attacks by rendering the site in external frames. Recommended value is: <b>\"SAMEORIGIN\"</b>.");
        }

        break;

      case "x-xss-protection":
        if (value === "") {
          warnings.push("The <b>X-XSS-Protection</b> header is not set. Setting it to <b>\"1;mode=block\"</b> will prevent the page from loading on some browsers if reflected XSS is detected.");
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
