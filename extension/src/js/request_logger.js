window.onload = function() {
  var url = new URL(window.location.href);
  var weakReferrer = url.searchParams.get("ref");
  console.log("REF IS " + weakReferrer);
  document.getElementById("output").innerHTML = weakReferrer;


  // Attempt to write the contents of the URL from which
  // the XSS request came from to LocalStorage
  if (localStorage.weakURLs) {
    var weakURLs = JSON.parse(localStorage.getItem("weakURLs"));
    var urlSet = new Set(weakURLs);
    urlSet.add(weakReferrer);
    weakURLs = Array.from(urlSet);
    console.log("Adding to local store");
    localStorage.weakURLs = JSON.stringify(weakURLs);
    sendReflectedXSSNotification(weakReferrer);
  } else {
    var weakURLs = [weakReferrer];
    console.log("Adding to local store for first time");
    localStorage.weakURLs = JSON.stringify(weakURLs);
    sendReflectedXSSNotification(weakReferrer);
  }
}

function sendReflectedXSSNotification(url) {
  chrome.runtime.sendMessage({
    msg: "reflectedXSS",
    data: {
      subject: "New reflected XSS URL found!",
      content: url
    }
  });
}
