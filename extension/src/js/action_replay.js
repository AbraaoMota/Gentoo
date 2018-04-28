// This is a content script handling the logic for the action replay mechanism

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
    var ARsession = storage["ARsession"];

    if (message.msg === "toggleAR") {

      // Either start or stop Action Replay session
      toggleActionRecordingButton();
      messageHandlerBusy = false;

    } else if (message.name === "devToolsParams" && ARsession === "recording") {

      storeARrequests(storage, message);
      messageHandlerBusy = false;

    }
  });
}

// Set messageHandler to listen to messages
chrome.runtime.onMessage.addListener(messageHandler);

// Log important parameters sent in requests and responses, forwarded from devTools page
// Only important messages here are while the action replay session is recording
function storeARrequests(storage, message) {

  var ARlist = storage["ARrequests"];
  if (!ARlist) {
    ARlist = [];
  }

  ARlist.push({
    url:         message.url,
    reqCookies:  message.reqCookies,
    reqHeaders:  message.reqHeaders,
    reqParams:   message.reqParams,
    respCookies: message.respCookies,
    respHeaders: message.respHeaders,
    respContent: message.respContent
  });

  chrome.storage.local.set({ ARrequests: ARlist });

}

// If a new page has been loaded and AR is enabled
// or is currently recording, show the button accordingly
window.addEventListener("load", function() {

  chrome.storage.local.get(function(store) {
    var enableAR = store["enableAR"];
    var ARsession = store["ARsession"];

    if (enableAR) {
      addActionReplayButtonToPage();
      if (ARsession === "recording") {
        var actionReplayButton = document.getElementById("actionReplayButton");
        actionReplayButton.className = "Rec";
      }
    }
  });

}, false);

// Adds and removes the action replay button to the page when triggered
function toggleActionRecordingButton() {

  var actionReplayButton = document.getElementById("actionReplayButton");
  if (actionReplayButton) {

    // The button is already present and was clicked, therefore
    // stop recording
    actionReplayButton.parentNode.removeChild(actionReplayButton);

  } else {

    addActionReplayButtonToPage();

  }
};

// Creates and adds the button to the page, makes it draggable
function addActionReplayButtonToPage() {

  // Button not present in the page - create and append to page
  actionReplayButton = document.createElement("button");
  actionReplayButton.innerHTML = "A.R.";
  actionReplayButton.id = "actionReplayButton";
  actionReplayButton.className = "notRec";
  document.body.insertBefore(actionReplayButton, document.body.childNodes[0]);

  // Make button draggable anywhere
  dragElement(actionReplayButton);

  // Add drag listener to cancel on mouseUp to differentiate
  // dragging and clicking
  var dragFlag = 0;
  actionReplayButton.addEventListener("mousedown", function(){
    dragFlag = 0;
  }, false);
  actionReplayButton.addEventListener("mousemove", function(){
    dragFlag = 1;
  }, false);
  actionReplayButton.addEventListener("mouseup", function(){
    if(dragFlag === 0){
      // This registers as a click, not a drag
      // Allows to drag while recording and not stop recording
      toggleARrecording();
    } else if(dragFlag === 1){
      // Registers as a drag, not a click
      // console.log("drag");
    }
  }, false);

}

// This starts and stops the recording action when the button
// is clicked, toggling between starting and closing the session
// (Finishing a session may entail replaying actions to find attacks)
function toggleARrecording() {

  if (actionReplayButton.className === "notRec") {
    // Add actual Action Replay logic here
    actionReplayButton.className = "Rec";
    // localStorage.ARsession = "recording";
    chrome.storage.local.set({ "ARsession": "recording" });

  } else {
    // Recording was stopped
    actionReplayButton.className = "notRec";
    // localStorage.ARsession = "finished";
    chrome.storage.local.set({ "ARsession": "finished" });

    // Need to initiate the replay of the actions recorded
    // Change any inputs necessary
  }

}

// Function code adapted from https://www.w3schools.com/howto/howto_js_draggable.asp
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
