window.onload = function() {
  var forms = document.getElementsByTagName("form");
  // console.log(forms);
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
    recommendation.setAttribute("href", "#");
    recommendation.addEventListener('click', function() {
      alert('BOOP');
    });

    var newParent = document.createElement("div");

    newParent.appendChild(firstInputChild);
    newParent.appendChild(recommendation);
    currForm.insertBefore(newParent, currForm.firstChild);
  }
}
