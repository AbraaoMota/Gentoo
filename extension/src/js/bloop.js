// Attempt to run JS despite generated XSS errors
function ignoreerror() {
  return true;
}
window.onerror = ignoreerror();

// Run script after page load
window.onload = function() {

  // Inject "Investigate Form" buttons on input
  var forms = document.getElementsByTagName("form");
  for (var i = 0; i < forms.length; i++) {
    var currForm = forms[i];
    var inputs = currForm.getElementsByTagName("input");
    if (!inputs.length)
      continue;
    var firstInputChild = inputs[0];

    var recommendation = document.createElement('a');
    recommendation.classList.add("recommendation");
    var text = document.createTextNode("Investigate form");
    recommendation.appendChild(text);
    // Make it look clickable
    recommendation.setAttribute("href", "javascript:void(0)");

    recommendation.child = firstInputChild;
    recommendation.form = currForm;

    // Attempt XSS (or otherwise) upon clicking the form
    recommendation.addEventListener('click', function(evt) {
      attemptXSS(evt.target.child, evt.target.form);
    });

    // Create new div wrapper for element to be next to input
    var newParent = document.createElement("div");
    newParent.appendChild(firstInputChild);
    newParent.appendChild(recommendation);
    currForm.insertBefore(newParent, currForm.firstChild);
  }
}

function attemptXSS(inputElement, parentForm) {
  // Here is one attempt - I'd want to pass arguments such as time limit, as well as a library of inputs to fuzz etc
  // inputElement.value = "<img src=a onerror=\"alert('XSS Attack')\">";
  // inputElement.value = "<img src=a onerror=\"alert('henlo');window.location.replace('http://www.miniclip.com')\">";
  var extId = chrome.runtime.id;
  var currLoc = window.location;

  // Whenever I get a chance to run JS as an exploit (XSS), make a request to the extension
  // Request logger stores referral URL's as weak URL's from which you can trigger an XSS exploit
  var jsExploitStr = "window.location.replace('chrome-extension://" + extId + "/request_logger.html?ref=" + currLoc;

  // Specific attack (using onerror element of image)
  inputElement.value = "<img src=a onerror=\"" + jsExploitStr + "')\">";

  // Submit form
  parentForm.submit();
}

// $(window).ready(function() {
//   // bind 'myForm' and provide a simple callback function
//   $('#boop').ajaxSubmit(function() {
//     console.log("WE GOT TO AJAX SUBMIT");
//     alert("Thank you for your comment!");
//   });
// });

