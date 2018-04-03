// <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js"></script>


// var native_alert = alert;

// alert = function(msg) {
//   console.log("ALERTING");
//   console.log('An alert was generated. Message: ' + msg);
//   native_alert(msg);
// }

function ignoreerror() {
  return true;
}

window.onerror = ignoreerror();

window.onload = function() {


  function ignoreerror()
  {
    return true
  }
  window.onerror=ignoreerror();

  // (function() {
  //   console.log("Do we get this far?");
  //   var _old_alert = window.alert;

  //   window.alert = function() {
  //     console.log("Not this far");
  //     console.log("ALERTING" + arguments);
  //     // document.body.innerHTML += "<br>alerting";
  //     _old_alert.apply(window,arguments);
  //     // document.body.innerHTML += "<br>done alerting<br>";
  //   };
  // })();


  var forms = document.getElementsByTagName("form");
  for (var i = 0; i < forms.length; i++) {
    var currForm = forms[i];
    var inputs = currForm.getElementsByTagName("input");
    if (!inputs.length)
      continue;
    var firstInputChild = inputs[0];
    // console.log("FIRST INPUT CHILD IS: " + firstInputChild);
    // firstInputChild.value = "HELLOOOOOOOOO" + i.toString();

    var recommendation = document.createElement('a');
    recommendation.classList.add("recommendation");
    var text = document.createTextNode("Investigate form");
    recommendation.appendChild(text);
    recommendation.setAttribute("href", "javascript:void(0)");

    recommendation.child = firstInputChild;
    recommendation.form = currForm;

    recommendation.addEventListener('click', function(evt) {
      // console.log("We got to click event");
      // alert('Happens 2nd');
      attemptXSS(evt.target.child, evt.target.form);
      // alert("Happens 3rd");
    });

    var newParent = document.createElement("div");

    newParent.appendChild(firstInputChild);
    newParent.appendChild(recommendation);
    currForm.insertBefore(newParent, currForm.firstChild);
  }

  // window.addEventListener('build', function (e) {
  //   alert("We are now after the XSS attempt");
  // });


}

function attemptXSS(inputElement, parentForm) {
  // Here is one attempt - I'd want to pass arguments such as time limit, as well as a library of inputs to fuzz etc
  inputElement.value = "<img src=a onerror=\"alert('XSS Attack')\">";
  parentForm.submit();

  // var event = new Event('build');
  // window.dispatchEvent(event);
}

// $(window).ready(function() {
//   // bind 'myForm' and provide a simple callback function
//   $('#boop').ajaxSubmit(function() {
//     console.log("WE GOT TO AJAX SUBMIT");
//     alert("Thank you for your comment!");
//   });
// });



// Maybe taking the wrong approach
// Analyse requests
// Gather user owned parts
// Check html outputs for contents















