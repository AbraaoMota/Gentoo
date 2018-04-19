chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg === "toggleAR") {
      toggleActionRecordingButton();
    }

    // Return true required to use this callback asynchronously
    return true;
  }
);

window.addEventListener("load", function() {
  console.log("Action replay onload");
  if (localStorage.ARsession == "recording") {
    addActionReplayButtonToPage();
    var actionReplayButton = document.getElementById("actionReplayButton");
    actionReplayButton.className = "Rec";
  }
}, false);

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

function toggleARrecording() {
  if (actionReplayButton.className === "notRec") {
    // Add actual Action Replay logic here
    actionReplayButton.className = "Rec";
    localStorage.ARsession = "recording";

    // IDEA - if im not allowed to have this here create a queue of 
    // requests, only add to it if the timing of most recent toggle is
    // matches the message timing
    // Record any inputs, URL params, post data sent
    chrome.runtime.onMessage.addListener(
      function(msg, sender, sendResponse) {
        if (msg.reqHeaders && msg.respHeaders) {
          // Here we want to store any useful information for later analysis 
          // I also wanna grab the url here so i can set start and finish
          // points for different potential attacks
          // This needs to be a list of requests in a sorted fashion
          // localStorage.reqCookies = msg.reqCookies;
          // localStorage.
        }

        // Return true required to use this callback asynchronously
        return true;
      }
    );

  } else {
    // Recording was stopped
    actionReplayButton.className = "notRec";
    localStorage.ARsession = "finished";

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
