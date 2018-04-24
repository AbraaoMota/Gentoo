// This page logs requests as well as a referrer page
// This page is used as a sure way to ensure an XSS attack
// was successful - currently, the only way to reach this
// page is programatically, so the referrer must have suffered
// from an executed XSS attack


// Whenever this page is loaded, store information regarding
// the referrer URL and append it to the list of weak URLs
// kept in localStorage
window.addEventListener("load", function() {

  var url = new URL(window.location.href);
  var weakReferrer = url.searchParams.get("ref");
  document.getElementById("output").innerHTML = weakReferrer;

  // Attempt to write the contents of the URL from which
  // the XSS request came from to LocalStorage
  // if (localStorage.weakURLs) {
  //   var weakURLs = JSON.parse(localStorage.getItem("weakURLs"));
  //   var urlSet = new Set(weakURLs);
  //   urlSet.add(weakReferrer);
  //   weakURLs = Array.from(urlSet);
  //   localStorage.weakURLs = JSON.stringify(weakURLs);
  //   sendReflectedXSSNotification(weakReferrer);
  // } else {
  //   var weakURLs = [weakReferrer];
  //   localStorage.weakURLs = JSON.stringify(weakURLs);
  //   sendReflectedXSSNotification(weakReferrer);
  // }
  
  chrome.storage.local.get("weakURLs", function(urlList) {
    if (chrome.runtime.lastError) {
      // First time this field is set in storage
      chrome.storage.local.set({ "weakURLs": [weakReferrer] });
    } else {
      // Append to existing field
      var urlSet = new Set(urlList);
      urlSet.add(weakReferrer);
      var weakURLs = Array.from(urlSet);
      chrome.storage.local.set({ "weakURLs": weakURLs });
    }
  });

  sendReflectedXSSNotification(weakReferrer);

}, false);

// Send a message to the popup page to notify a new weak URL has been found
function sendReflectedXSSNotification(url) {
  chrome.runtime.sendMessage({
    msg: "reflectedXSS",
    data: {
      subject: "New reflected XSS URL found!",
      content: url
    }
  });
}
