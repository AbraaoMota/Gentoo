window.onload = function() {
  var forms = document.getElementsByTagName("form");

  // console.log(forms);
  // var inputs = document.getElementsByTagName("input");

  // for (var i = 0; i < inputs.length; i++) {
  for (var i = 0; i < forms.length; i++) {
    var currForm = forms[i];
    var inputs = currForm.getElementsByTagName("input");
    // console.log(inputs);
    // var firstInput = inputs[0];
    var firstInputChild = inputs[0];
    // console.log(firstChild);
    // console.log(firstChild.type);
    // var firstInput = firstChild == null ? document.createTextNode("bloop") : firstChild.innerHTML;

    var recommendation = document.createElement('a');
    recommendation.classList.add("recommendation");
    // recommendation.classList.add("style='display:inline'");
    var text = document.createTextNode("Investigate form");
    recommendation.appendChild(text);
    recommendation.setAttribute("href", "#");
    recommendation.addEventListener('click', function() {
      alert('BOOP');
    });

    var newParent = document.createElement("div");

    // currForm.appendChild(newParent);
    // inputs[i].parentNode.insertBefore(newParent, inputs[i]);
    // newParent.appendChild(inputs[i]);
    // firstInput.parentNode.insertBefore(newParent, firstInput);

    newParent.appendChild(firstInputChild);
    newParent.appendChild(recommendation);
    currForm.insertBefore(newParent, currForm.firstChild);
  }
}
