// This script may call functions from other content scripts
// as long as it is loaded after them

// Message handling logic - contains a flag to synchronously process messages
// to avoid async DB overwrites
var messageHandlerBusy = false;
var messageHandler = function(message, sender, sendResponse) {

  if (messageHandlerBusy) {
    window.setTimeout(function() {
      messageHandler(message, sender, sendResponse);
    }, 0);
    return;
  }

  messageHandlerBusy = true;

  chrome.storage.local.get(function(storage) {
    var enablePassiveMode = storage["enablePassiveMode"];

    if (message.msg === "togglePassiveMode") {
      // Either start or stop Passive Mode
      togglePassiveMode();
      messageHandlerBusy = false;
    } else if (message.name === "devToolsParams" && enablePassiveMode) {
      storePassiveRequests(storage, message);
      messageHandlerBusy = false;
    }
  });
}

// Log any requests and responses for analysis
function storePassiveRequests(storage, message) {

  var passiveRequests = storage["passiveRequests"];
  if (!passiveRequests) {
    passiveRequests = [];
  }

  if (shouldStorePassiveRequest(message, passiveRequests, storage)) {
    var passiveModeWindowSize = storage["passiveModeWindowSize"];
    if (passiveRequests.length >= passiveModeWindowSize) {
      var evictedReqest = passiveRequests.shift();
      console.log("WINDOW FULL. EVICTING THIS REQUEST:");
      console.log(evictedReqest);
    }

    passiveRequests.push({
      url:         message.url,
      reqCookies:  message.reqCookies,
      reqHeaders:  message.reqHeaders,
      reqParams:   message.reqParams,
      respCookies: message.respCookies,
      respHeaders: message.respHeaders,
      respContent: message.respContent
    });

    chrome.storage.local.set({ "passiveRequests": passiveRequests });
  }
}

// Helper function do decide whether a passive request should be stored
function shouldStorePassiveRequest(request, requestList, storage) {
  var passiveModeEnabled = storage["enablePassiveMode"];



}

// Enable or disable Passive Mode
function togglePassiveMode() {
  chrome.storage.local.get(function(storage) {
    var enablePassiveMode = storage["enablePassiveMode"];

    if (enablePassiveMode) {

    } else {

    }
  });
}
