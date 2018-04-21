// Initialize modals whenever the page is ready
$(document).ready(function() {
  $('#xssWarning').modal();
});

// Update visuals on popup page load
window.addEventListener("load", function() {
  // Make notification badge disappear from popup when window opened
  chrome.browserAction.setBadgeText({ text: "" });

  // Update switches based on storage
  // Visual switch checking is a separate element to the lever that
  // triggers the switch
  var checkboxAR = document.getElementById("checkboxAR");
  console.log("ENABLE AR IS GOING TO BE " + localStorage.enableAR);
  checkboxAR.checked = parseInt(localStorage.enableAR);

  // Create elements for the weak URL list to appear
  // This list is kept in localStorage under the 'weakURLs' key
  var weakURLs = JSON.parse(localStorage.getItem("weakURLs"));
  var reflectedList = document.getElementById("xssURLs");
  if (weakURLs) {
    for (i = 0; i < weakURLs.length; i++) {
      var p = document.createElement("p");
      p.innerHTML = weakURLs[i];
      reflectedList.appendChild(p);
    }
  }
}, false);

// Add listeners to the page for events created from the popup page
document.addEventListener('DOMContentLoaded', function() {

  // Settings regarding activating Action replay
  var actionReplay = document.getElementById("actionReplayEnabled");
  actionReplay.addEventListener("click", function() {
    toggleActionReplay();
  });

  // Activate the listeners for the active tab
  clearReflectedXSS();

  // Reactivate listeners for when we switch back into this tab
  // and DOM can't find the elements anymore
  var xssTab = document.getElementById("xssTab");
  xssTab.addEventListener("load", function() {
    clearReflectedXSS();
  });
});

// Clears out the list of URLs to which we have been redirected from to reach
// the `request_logger` page
function clearReflectedXSS() {
  // Clear weakURL list
  var clearXssURLs = document.getElementById("clearXssURLs");
  clearXssURLs.addEventListener('click', function() {
    localStorage.removeItem("weakURLs");
    location.reload();
  });
}

// Function switch for activating the AR button functionality on a page
function toggleActionReplay() {
  var checkboxAR = document.getElementById("checkboxAR");

  if (!localStorage.getItem("enableAR")) {
    // If it hasn't been set yet, the switch was just checked, thus set it to 1
    localStorage.enableAR = 1;
  } else {
    // Toggle storage
    localStorage.enableAR = 1 - parseInt(localStorage.enableAR);

    // Send out a message
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {msg: "toggleAR"}, function(response) {});
    });
  }
}
