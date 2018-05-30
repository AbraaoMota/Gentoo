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
      runPassiveAnalysis(storage, message);
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
function runPassiveAnalysis(storage, r) {

  // This mode *should* only be enabled after turning it on in the settings, meaning
  // it won't attempt an undefined array access
  var passiveModeCSRFEnabled = storage["settings"]["passiveModeCSRFEnabled"];
  var passiveModeCookiesEnabled = storage["settings"]["passiveModeCookiesEnabled"];
  // We only want to analyse "text/html" type requests for now
  var contentTypeIndex = headerIndex(r, "respHeaders", "Content-type");

  if (contentTypeIndex >= 0 && r["respHeaders"][contentTypeIndex].value.includes("text/html")) {
    console.log("ANALYSING HEADERS FOR A REQUEST");
    analyseRequestHeaders(r);

    if (passiveModeCSRFEnabled) {
      analyseRequestForCSRF(r);
    }

    if (passiveModeCookiesEnabled) {
      analyseRequestForCookies(r);
    }
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

  // Attach warnings to request
  if (!r["warnings"]) {
    r["warnings"] = [];
  }
  r["warnings"] = r["warnings"].concat(warnings);

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

// Run some basic CSRF warning checks on the request
function analyseRequestForCSRF(r) {

  // In this check we are assuming that the page in question matches some basic
  // requirements:
  // 1) Must have a form for submission
  // 2) A session related cookie has been set
  // 3) The form does not contain a hidden input
  // If the website has a mix of these then it is possible that the website is
  // purely using cookies to handle sessions as opposed to extra form inputs
  // in the form of Anti-CSRF tokens or extra randomised URL inputs. This
  // is very difficult to fully automate checks for so will only produce a warning
  // for now. Matching names will be done based on rudimentary checks against a
  // preformed list.

  var responseContent = r.respContent;

  // No form to submit to potentially cause CSRF
  if (!responseContent.includes("<form")) return;

  var allCookies = r.reqCookies.concat(r.respCookies);

  // A basic list of potential matches to check for in cookies
  var cookieNameMatch = [
    "phpsessid",
    "jsessionid",
    "cfid",
    "cftoken",
    "asp.net_sessionid",
    "id",
    "sess",
    "auth"
  ];

  var potentialSessionIdSet = false;
  for (var i = 0; i < allCookies.length; i++) {
    var currCookie = allCookies[i];

    for (var j = 0; j < cookieNameMatch.length; j++) {
      var currMatch = cookieNameMatch[j];

      if (currCookie["name"].toLowerCase().includes(currMatch)) {
        potentialSessionIdSet = true;
        break;
      }
    }
    if (potentialSessionIdSet) break;
  }

  // Couldn't find a potentially matching cookie for a session id
  if (!potentialSessionIdSet) return;

  // Search response content for a hidden input
  var inputSearchRegex = /(<input)([^>])+>/g;

  var matchInputs;
  while ((matchInputs = inputSearchRegex.exec(responseContent)) !== null) {
    var matchedString = matchInputs[0];
    if (matchedString.toLowerCase().includes("type=\"hidden\"")) {
      // We got this far and found a hidden input. Don't know for sure
      // if it's an Anti-CSRF token but we will leave it there
      return;
    }
  }

  // We got this far and didn't find a hidden input. Issue a warning for potential CSRF
  // Attach warnings to request
  var warnings = ["This request showed signs of a <b>potential CSRF vulnerability</b>. It looks like a session cookie was set, and a form on this page is not using an Anti-CSRF token."];
  if (!r["warnings"]) {
    r["warnings"] = [];
  }
  r["warnings"] = r["warnings"].concat(warnings);

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

// Analyses the request for weak cookie settings for potential session cookies
function analyseRequestForCookies(r) {
  // A basic list of potential matches to check for in cookies
  var sessionCookieNameMatch = [
    "phpsessid",
    "jsessionid",
    "cfid",
    "cftoken",
    "asp.net_sessionid",
    "id",
    "sess",
    "auth"
  ];

  console.log("ANALYSING A REQUEST FOR WEAK COOKIE SETTINGS");

  var allCookies = r.reqCookies.concat(r.respCookies);

  console.log("ALL COOKIES");
  console.log(allCookies);

  var warnings = [];

  for (var i = 0; i < allCookies.length; i++) {
    var currCookie = allCookies[i];
    var cookieName = currCookie["name"];
    var secureSet = currCookie["secure"];
    var httpOnlySet = currCookie["httpOnly"];
    var cookieMatched = false;

    for (var j = 0; j < sessionCookieNameMatch.length; j++) {
      if (cookieMatched) break;
      var currMatch = sessionCookieNameMatch[j];
      if (currCookie["name"].toLowerCase().includes(currMatch)) {
        // This is potentially a session id cookie, check for security
        cookieMatched = true;
        console.log(currCookie["name"]);
        console.log(currMatch);
        console.log("THIS IS A POTENTIAL WEAK COOKIE");
        if (!secureSet || !httpOnlySet) {
          var cookieWarning = "The cookie <b>" + cookieName + "</b> does not have the ";
          if (!secureSet && httpOnlySet) {
            cookieWarning = cookieWarning.concat("<b>secure</b> flag set.");
          }
          if (!httpOnlySet && secureSet) {
            cookieWarning = cookieWarning.concat("<b>httpOnly</b> flag set.");
          }
          if (!secureSet && !httpOnlySet) {
            cookieWarning = cookieWarning.concat("<b>httpOnly</b> or the <b>secure</b> flag set.");
          }
          warnings.push(cookieWarning);
        }
      }
    }

  }

  if (!r["warnings"]) {
    r["warnings"] = [];
  }
  r["warnings"] = r["warnings"].concat(warnings);

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

