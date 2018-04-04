chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.msg === "reflectedXSS") {
      alert("Received msg");
      console.log(request.data.subject)
      console.log(request.data.content)
    }
  }
);
