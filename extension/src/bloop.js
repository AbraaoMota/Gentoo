window.onload = function() {
  var forms = document.getElementsByTagName("form");


  // var inputs = document.getElementsByTagName("input");

  // for (var i = 0; i < inputs.length; i++) {
  for (var i = 0; i < forms.length; i++) {
    var currForm = forms[i];
    var inputs = currForm.getElementsByTagName("input");
    var firstInput = inputs[0];

    var recommendation = document.createElement('a');
    recommendation.classList.add("recommendation");
    // recommendation.classList.add("style='display:inline'");
    var text = document.createTextNode("Investigate input");
    recommendation.appendChild(text);
    recommendation.addEventListener('click', function() {
      alert('BOOP');
    });

    var newParent = document.createElement("div");

    // inputs[i].parentNode.insertBefore(newParent, inputs[i]);
    // newParent.appendChild(inputs[i]);
    firstInput.parentNode.insertBefore(newParent, firstInput);
    newParent.appendChild(firstInput);
    newParent.appendChild(recommendation);
  }
}
