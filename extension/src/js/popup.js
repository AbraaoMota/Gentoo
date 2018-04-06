// Initialize modals on doc ready
$(document).ready(function() {
  $('#reflectedXSSWarning').modal();
});

window.onload = function() {
  // Make notification badge disappear from popup when window opened
  chrome.browserAction.setBadgeText({ text: "" });

  // Create elements for the weak URL list to appear
  // This list is kept in localStorage under the 'weakURLs' key
  var weakURLs = JSON.parse(localStorage.getItem("weakURLs"));
  var reflectedList = document.getElementById("reflectedXSS");
  if (weakURLs) {
    for (i = 0; i < weakURLs.length; i++) {
      var p = document.createElement("p");
      p.innerHTML = weakURLs[i];
      reflectedList.appendChild(p);
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {

  var link = document.getElementById('derp');
  link.addEventListener('click', function() {
    console.log("Henlo switch");
  });

  var xssTab = document.getElementById("xssTab");
  xssTab.addEventListener('click', function() {
    clearReflectedXSS();
  });

});

function clearReflectedXSS() {
  // Clear weakURL list
  var clearReflectedXSS = document.getElementById("clearReflectedXSS");
  clearReflectedXSS.addEventListener('click', function() {
    localStorage.removeItem("weakURLs");
    location.reload();
  });
}

