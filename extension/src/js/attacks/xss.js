function imgonload() {
  return {
    "name": "imgonload",
    "value": "<img src=a onerror=\"window.location.replace('chrome-extension://" + chrome.runtime.id + "/request_logger.html?ref=" + window.location + "')\">"
  }
}
