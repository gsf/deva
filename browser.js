(new EventSource('/_reload')).onmessage = function (e) {
  window.location.reload(true);
};
