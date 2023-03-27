// this is the kill-switch for service workers of the old versions
// this file won't be accessed by the current version

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}
