// alert("Running custom popupjs");

// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     console.log("Received a message!!");
//     if (request.msg === "reflectedXSS2") {
//       alert("Received msg in popup");
//       console.log(request.data);
//     }
  // }
// );

window.onload = function() {


  var weakURLs = JSON.parse(localStorage.getItem("weakURLs"));
  var reflectedList = document.getElementById("reflectedXSS");
  for (i = 0; i < weakURLs.length; i++) {
    var p = document.createElement("p");
    p.innerHTML = weakURLs[i];
    reflectedList.appendChild(p);
  }
}

