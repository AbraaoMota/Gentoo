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
    chrome.storage.local.set({ "ARsession": "recording" });

  } else {
    // Recording was stopped
    actionReplayButton.className = "notRec";
    chrome.storage.local.set({ "ARsession": "finished" });


    // Analysis and replay of actions here
    analyseAndReplayAttacks();

  }
}


var analyserBusy = false;

function analyseAndReplayAttacks() {

  if (analyserBusy) {
    window.setTimeout(function() {
      analyseAndReplayAttacks();
    }, 0);
    return;
  }

  analyserBusy = true;

  chrome.storage.local.get(function(storage) {
    var baselineRequests = storage["ARrequests"];
    var weakURLs = storage["weakURLs"];

    // For now, analyse only the requests which generate a response
    // that matches the Content-Type "text/html"
    if (!baselineRequests) {
      return;
    }

    console.log("THESE ARE THE BASELINE REQUESTS WE HAVE");
    console.log(baselineRequests);
    for (var i = 0; i < baselineRequests.length; i++) {
      var r = baselineRequests[i];
      var contentTypeIndex = headerIndex(r, "respHeaders", "Content-type");

      if (contentTypeIndex >= 0 && r["respHeaders"][contentTypeIndex].value.includes("text/html")) {

        // Here we need to produce a list of parameters and other content which may be user
        // injected - this could be query parameters or cookie values
        var userInputs = [];

        // Here we want to create a userInput object which stores different values
        // pertinent to a user input. This is necessary to know which parameters to
        // override in the request when being replayed - Namely:
        //
        // var input = {
        //   type: "cookie" / "param" / "header",
        //   name: "",
        //   value: "",
        //   url: ""
        // }

        // Append all cookies to the list
        for (var j = 0; j < r.reqCookies.length; j++) {
          var uInput = {
            type: "cookie",
            name: r.reqCookies[j].name,
            value: r.reqCookies[j].value,
            url: r.url
          }
          userInputs.push(uInput);
        }

        // Append all query parameter values to the list
        for (var k = 0; k < r.reqParams.length; k++) {
          var uInput = {
            type: "param",
            name: r.reqParams[k].name,
            value: r.reqParams[k].value,
            url: r.url
          }
          userInputs.push(uInput);
        }

        // Append all header values to the list
        for (var l = 0; l < r.reqHeaders.length; l++) {
          var uInput = {
            type: "header",
            name: r.reqHeaders[l].name,
            value: r.reqHeaders[l].value,
            url: r.url
          }
         userInputs.push(uInput);
        }

        var content = r.respContent;
        var potentiallyDangerous = [];

        console.log("WE'VE GOTTEN HERE");
        // Loop over all possible user inputs to compare against
        if (!userInputs) {
          return;
        }
        for (var m = 0; m < userInputs.length; m++) {
          var currUserInput = userInputs[m];
          // if (content.includes(currUserInput.value)) {
          if (couldBeDangerous(content, currUserInput)) {
            // You want to flag this up as a warning because it looks as though content has been injected
            // into the page - these are also the ones you want to attempt to hijack using JS
            potentiallyDangerous.push(currUserInput);
          }
        }

        chrome.storage.local.set({
          "potentialXSS": potentiallyDangerous
        }, function() {
          analyserBusy = false;
        });

        // Now we have a list of potentially dangerous inputs (things that seem reflected)
        // we can send a warning message listing all of these out, as well as forge JS attacks
        sendIntermediaryWarning(potentiallyDangerous);
        replayAttacks(potentiallyDangerous);
        return;
      }
    }
  });
}

// Helper function to determine whether an input might be dangerous or not
function couldBeDangerous(webContent, input) {

  if (!input.value) {
    return false;
  }
  if (webContent.includes(input.value)) {
    return true;
  }

  // TODO: move these into global vars to avoid creating everytime
  // TODO: also apply different types of fuzzings
  // TODO: suffixes and different regex applications
  var tagEncodings = [
    "<",
    "%3C",
    "%3D",
    "%3E",
    ""
  ];

  var htmlTags = [
    "applet",
    "body",
    "embed",
    "frame",
    "script",
    "frameset",
    "html",
    "iframe",
    "img",
    "style",
    "layer",
    "ilayer",
    "meta",
    "object"
  ];

  var possiblyDangerous = [];

  for (var i = 0; i < tagEncodings.length; i++) {
    for (var j = 0; j < htmlTags.length; j++) {
      possiblyDangerous.push(tagEncodings[i] + htmlTags[j]);
    }
  }

  for (var i = 0; i < possiblyDangerous.length; i++) {
    // If we apply a lowercase change to the input value we are more
    // likely to catch attacks taking advantage of case sensitivity
    if (input.value.toLowerCase().includes(possiblyDangerous[i])) {
      return true;
    }
  }

  // try {
    // If the value of the input evaluates to a valid JS function
    // then it might be potentially dangerous
    // TODO: this check is insufficient and too permissive
    // new Function(input.value);
    // return true;
  // } catch (e) {
    // // if (e.name === "SyntaxError") {
    //   return false;
    // // }
  // }

}

// Warn the extension of potential XSS inputs
function sendIntermediaryWarning(potentiallyDangerousInputs) {
  chrome.runtime.sendMessage({
    msg: "potentialXSS",
    data: {
      subject: "These inputs look like they may be reflected on the site",
      content: potentiallyDangerousInputs
    }
  });
}

// In this function, you want to attempt several different attacks PER potentially
// dangerous input, and report all different attacks that succeed.
// The vulnerable website report should be automatically done if the XSS is
// successful as we attempt to redirect to the request logger page
function replayAttacks(potentiallyDangerousInputs) {

  // var XSSattacks = readTextFile("chrome-extension://" + chrome.runtime.id + "/js/attacks/xss.js");
  // var XSSattacks = readTextFile("chrome-extension://" + chrome.runtime.id + "/js/attacks/xss.js");
  var XSSattacks = [];

  XSSattacks.push(imgonload());

  console.log("WE HAVE THESE XSS ATTACKS");
  console.log(XSSattacks);

  console.log("WE HAVE THESE POTENTIALLY DANGEROUS INPUTS");
  console.log(potentiallyDangerousInputs);

  var attackRequests = [];

  for (var i = 0; i < potentiallyDangerousInputs.length; i++) {
    for (var j = 0; j < XSSattacks.length; j++) {
      var input = potentiallyDangerousInputs[i];
      var attackName = XSSattacks[j].name;
      var attackValue = XSSattacks[j].value;

      var url = input["url"];

      console.log("PREVIOUS URL WAS");
      console.log(url);

      if (input.type === "param") {
        url = url.replace(input.name + "=" + input.value, input.name + "=" + encodeURIComponent(attackValue).replace("%20", "+"));
      }

      // THIS URL REDIRECTS ME
      // http://localhost:8000/testpages/?injection=%3Cimg+src%3Da+onerror%3D%22window.location.replace%28%27chrome-extension%3A%2F%2Flegepcikgaoelkacchildfmacibkgidc%2Frequest_logger.html%3Fref%3Dhttp%3A%2F%2Flocalhost%3A8000%2Ftestpages%2F%27%29%22%3E&df=

      console.log("FINAL ATTACK URL IS");
      console.log(url);

      var windowName = "attack" + (i + j).toString();
      console.log("OPENING THIS URL: " + url);
      var attackWindow = window.open(url, windowName);
      return;


      // // We have enough information to repeat the request using
      // // the new attackValue
      // attackRequests.push(new XMLHttpRequest());
      // var attackRequest = attackRequests[i+j];
      // var url = input["url"];

      // // if (input.type === "param") {
      // //   url = url.concat("&" + input.name + "=" + attackValue);
      // // }

      // console.log("We are attempting an attack to URL\n" + url);

      // // This may be SUPER DANGEROUS
      // attackRequest.onreadystatechange = function() {
      //   if ((attackRequest.status == 200) && (attackRequest.readyState == 4)) {
      //     // Here we want to try and run the JS from the page as if we were on it
      //     // this will allow us to detect any potential XSS ran generated from the
      //     // attack
      //     // console.log("READY STATE IS: " + attackRequest.readyState);
      //     // console.log("STATUS IS: " + attackRequest.status);
      //     var testDiv = document.createElement("div");
      //     testDiv.id = "testDiv";
      //     document.body.appendChild(testDiv);
      //     console.log("WERE IN SET HTML FOR THIS INPUT");
      //     console.log(input);
      //     // console.log("This is the attack requests list");
      //     // console.log(attackRequests);
      //     sethtml(testDiv, attackRequest.responseText);
      //   }
      // };

      // if (input.type === "param") {
      //   url = url.replace(input.name + "=" + input.value, "");
      // }

      // // attackRequest.open("GET", url, false);
      // attackRequest.open("POST", url, false);
      // attackRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

      // if (input.type === "header") {
      //   attackRequest.setRequestHeader(input.name, attackValue);
      // } else if (input.type === "cookie") {
      //   // TODO: this may not be possible, look into a way of making
      //   // this work
      //   attackRequest.withCredentials = true;
      // }

      // if (input.type !== "param") {
      //   attackRequest.send();
      // } else {
      //   attackRequest.send(input.name + "=" + attackValue);
      // }

      // // At this point, if any of the attacks is successful, it should
      // // be reported in the request logger
      // console.log("SENT ONE REQUEST WHILE MEDDLING WITH THIS INPUT");
      // console.log(input.type);
    }
  }

}

function sethtml(div,content) {
  var search = content;
  var script;
  var truScript;


  console.log("SEARCHING THROUGH THIS CONTENT");
  console.log(content);
  // while (script = search.match(/(<script[^>]+javascript[^>]+>\s*(<!--)?)/i)) {
  // while (script = search.match(/(<script[^>]*>?[^>]+\/script>\s*(<!--)?)/i)) {
  while (script = search.match(/(<script([^>]+)?(javascript[^>]+)?>\s*(<!--)?)/i)) {
    search = search.substr(search.indexOf(RegExp.$1) + RegExp.$1.length);



    console.log("THIS IS THE SCRIPT I'VE EXTRACTED");
    console.log(script);

    console.log("SEARCH IS");
    console.log(search);


    if (!(endscript = search.match(/((-->)?\s*<\/script>)/))) break;

    block = search.substr(0, search.indexOf(RegExp.$1));
    search = search.substring(block.length + RegExp.$1.length);

    console.log("BLOCK IS");
    console.log(block);

    console.log("SEARCH IS NOW");
    console.log(search);

    var oScript = document.createElement('script');
    oScript.text = block;
    document.getElementsByTagName("head").item(0).appendChild(oScript);
    // truScript = document.createElement('script');
    // truScript.text = block;
    // document.getElementsByTagName("head").item(0).appendChild(truScript);
  }

  div.innerHTML = content;
  // document.getElementById(div).innerHTML = content;
  // document.getElementById("testDiv").innerHTML = content;
  // eval(truScript);
}

function readTextFile(file) {
  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", file, false);
  rawFile.onreadystatechange = function () {
    if(rawFile.readyState === 4) {
      if(rawFile.status === 200 || rawFile.status == 0) {
        var allText = rawFile.responseText;
        rawFile.fileContents = allText;
      }
    }
  }
  rawFile.send(null);

  return rawFile.fileContents;
}

// Helper function to determine whether a request has a given property within
// the 'paramType' array, returns index in paramType, -1 if it doesn't exist
function headerIndex(r, paramType, property) {
  var paramType = r[paramType];
  if (paramType) {
    for (var i = 0; i < paramType.length; i++) {
      // Lowercase both of these to minimise matching differences based on servers
      if (paramType[i].name.toLowerCase() === property.toLowerCase()) return i;
    }
  }

  return -1;
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
