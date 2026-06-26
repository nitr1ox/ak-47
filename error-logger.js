(function () {
  function logError(msg, stack) {
    try {
      fetch('https://ak47-backend.onrender.com/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: msg,
          stack: stack || '',
          page: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    } catch (e) {}
  }
  window.onerror = function (msg, src, line, col, err) {
    logError(msg, err ? err.stack : src + ':' + line + ':' + col);
  };
  window.onunhandledrejection = function (e) {
    logError('UnhandledPromise: ' + (e.reason && e.reason.message || e.reason), e.reason && e.reason.stack);
  };
  window.logError = logError;
})();
