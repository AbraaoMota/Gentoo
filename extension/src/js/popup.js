// Initialize modals whenever the page is ready
$(document).ready(function() {
  $('#xssWarning').modal();
  $("#potentialWarning").modal();
  $("#clearExtensionStorage").modal();
  $("#settings").modal({
    ready: settingsModalLoaded
  });
});


function settingsModalLoaded() {
  var recommenderSensitivity = document.getElementById("recommenderSensitivity");
  chrome.storage.local.get(function(storage) {
    var settings = storage["settings"];
    if (!settings) {
      settings = {
        "recommenderSensitivity": "1"
      }
    }
    recommenderSensitivity.value = settings["recommenderSensitivity"];
  });

  // Add appropriate listeners for whenever the settings modal is opened
  saveSettingsListener();
  forgetSettingsListener();
  recommenderSensitivityValueListener();
  recommenderEnablerListener();
}

// Update visuals on popup page load
window.addEventListener("load", function() {
  // Make notification badge disappear from popup when window opened
  chrome.browserAction.setBadgeText({ text: "" });

  // Update switches based on storage
  // Visual switch checking is a separate element to the lever that
  // triggers the switch
  var checkboxAR = document.getElementById("checkboxAR");
  chrome.storage.local.get("enableAR", function(flag) {
    if (flag["enableAR"] === 1) {
      checkboxAR.checked = flag;
    }
  });

  chrome.storage.local.get(function(storage) {
    // Create elements for the weak URL list to appear
    // This list is kept in chrome storage under the 'weakURLs' key
    var weakURLs = storage["weakURLs"];

    var reflectedList = document.getElementById("xssURLs");
    if (weakURLs) {
      for (var i = 0; i < weakURLs.length; i++) {
        var p = document.createElement("p");
        p.innerHTML = weakURLs[i];
        reflectedList.appendChild(p);
      }
    }

    // Create elements for the potentialXSS warning list,
    // this list is also kept in chrome storage under "potentialXSS"
    var potentialXSS = storage["potentialXSS"];
    var potentiallyDangerousList = document.getElementById("potentialXSS");

    if (potentialXSS) {
      var collection = document.createElement("ul");
      collection.classList.add("collection");

      for (var i = 0; i < potentialXSS.length; i++) {
        var collItem = document.createElement("li");
        collItem.classList.add("collection-item");

        var inputTypeAndUrl = document.createElement("p");
        inputTypeAndUrl.innerHTML = "This input is a <strong>" + potentialXSS[i].type + "</strong> from the URL:<br />" + potentialXSS[i].url;

        var inputValues = document.createElement("p");
        inputValues.innerHTML = "Name: " + potentialXSS[i].name + "<br />Value: " + potentialXSS[i].value;

        collItem.appendChild(inputTypeAndUrl);
        collItem.appendChild(inputValues);

        collection.appendChild(collItem);
      }
      potentiallyDangerousList.appendChild(collection);
    }

  });
}, false);

// Add listeners to the page for events created from the popup page
document.addEventListener('DOMContentLoaded', function() {

  // Settings regarding activating Action replay
  var actionReplay = document.getElementById("actionReplayEnabled");
  actionReplay.addEventListener("click", function() {
    toggleActionReplay();
  });

  // Activate the listeners for the active tab
  clearReflectedXSS();
  clearDangerousInputs();
  deleteExtensionStorage();

  // Reactivate listeners for when we switch back into this tab
  // and DOM can't find the elements anymore
  var xssTab = document.getElementById("xssTab");
  xssTab.addEventListener("load", function() {
    clearReflectedXSS();
    clearDangerousInputs();
    deleteExtensionStorage();
  });

});

// Enables and disables recommender engine
function recommenderEnablerListener() {
  var checkboxRecommendations = document.getElementById("checkboxRecommendations");
  // Get the setting if it has already been set
  chrome.storage.local.get(function(storage) {
    var settings = storage["settings"];
    var recommendationsEnabled = settings["recommendationsEnabled"];
    var sensitivity = document.getElementById("recommenderSensitivity");
    if (!recommendationsEnabled) {
      // Set default settings
      recommendationsEnabled = 0;
    }
    checkboxRecommendations.checked = recommendationsEnabled;
    if (recommendationsEnabled) {
      sensitivity.disabled = false;
    } else {
      sensitivity.disabled = true;
    }
  });

  var recommendationsEnabled = document.getElementById("recommendationsEnabled");
  recommendationsEnabled.addEventListener("click", function() {
    toggleRecommendations();
  });
}

// Enable and disable recommendations
function toggleRecommendations() {
  chrome.storage.local.get(function(storage) {
    var cachedSettings = storage["cachedSettings"];
    var recommendationsEnabled = cachedSettings["recommendationsEnabled"];
    var sensitivity = document.getElementById("recommenderSensitivity");

    if (!recommendationsEnabled) {
      cachedSettings["recommendationsEnabled"] = 1;
      sensitivity.disabled = false;
      chrome.storage.local.set({ "cachedSettings": cachedSettings });
    } else {
      cachedSettings["recommendationsEnabled"] = 0;
      sensitivity.disabled = true;
      chrome.storage.local.set({ "cachedSettings": cachedSettings });
    }
  });
}

// Forgets any setting changes when cancelling them
function forgetSettingsListener() {
  var forgetSettings = document.getElementById("forgetSettings");
  forgetSettings.addEventListener("click", function() {
    console.log("WE'RE FORGETTING OUR SETTING CHANGES");
    chrome.storage.local.get(function(storage) {
      var settings = storage["settings"];
      if (!settings) {
        // Set the default settings
        settings = {
          "recommenderSensitivity": "1"
        };
      }

      // Reset the cached settings to the previously known settings list
      chrome.storage.local.set({ cachedSettings: settings });
    });
    location.reload();
  });
}

// This saves any settings being changed on the settings page
function saveSettingsListener() {
  var saveSettings = document.getElementById("saveSettings");
  saveSettings.addEventListener("click", function() {
    chrome.storage.local.get(function(storage) {
      var cachedSettings = storage["cachedSettings"];
      var oldSettings = storage["settings"];
      if (!cachedSettings) {
        if (!oldSettings) {
          // Set the default settings
          oldSettings = {
            "recommenderSensitivity": "1"
          };
        }
        cachedSettings = oldSettings;
      }
      // Set the used settings to the cachedSettings we have
      chrome.storage.local.set({ settings: cachedSettings });
    });
    location.reload();
  });
}

// Clears out the list of URLs to which we have been redirected from to reach
// the `request_logger` page
function clearReflectedXSS() {
  // Clear weakURL list
  var clearXssURLs = document.getElementById("clearXssURLs");
  clearXssURLs.addEventListener('click', function() {
    chrome.storage.local.remove("weakURLs");
    location.reload();
  });
}

// Clears out the list of potentially dangerous inputs added on attack inspection
function clearDangerousInputs() {
  var clearDangerousInputs = document.getElementById("clearDangerousInputs");
  clearDangerousInputs.addEventListener("click", function() {
    chrome.storage.local.remove("potentialXSS");
    location.reload();
  });
}
// This function deletes all extension storage content
function deleteExtensionStorage() {
  var deleteStorageContent = document.getElementById("deleteExtStorage");
  deleteExtStorage.addEventListener("click", function() {
    chrome.storage.local.clear();
    location.reload();
  });
}

// Update recommender sensitivity settings on change
function recommenderSensitivityValueListener() {
  var recommenderSensitivity = document.getElementById("recommenderSensitivity");
  recommenderSensitivity.addEventListener("input", function() {
    var newVal = recommenderSensitivity.value;
    chrome.storage.local.get(function(storage) {
      var cachedSetting = storage["cachedSettings"];
      var oldSettings = storage["settings"];
      if (!cachedSetting) {
        if (!oldSettings) {
          // Use default settings
          oldSettings = {
            "recommenderSensitivity": "1"
          };
        }
        cachedSetting = oldSettings;
      }

      cachedSetting["recommenderSensitivity"] = newVal;
      console.log("WE'RE UPDATING THE SENSITIVITY TO " + newVal);
      chrome.storage.local.set({ cachedSettings: cachedSetting });
    });
  });
}

// Function switch for activating the AR button functionality on a page
function toggleActionReplay() {
  chrome.storage.local.get(function(storage) {
    var enableAR = storage["enableAR"];
    var ARsession = storage["ARsession"];

    if (!enableAR) {
      // This hasn't been set yet, switch was just enabled, therefore set to 1
      chrome.storage.local.set({ "enableAR": 1 });
    } else {
      // Toggle Storage
      chrome.storage.local.set({ "enableAR": 1 - enableAR });
      if (ARsession === "recording") {
        chrome.storage.local.set({ "ARsession": "finished" });
      }
    }
  });

  // Send out a message
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        msg: "toggleAR"
      },
      function(response) {}
    );
  });
}
