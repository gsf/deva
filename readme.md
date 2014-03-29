# deva

## about
deva does the following:

1. starts server.js
2. restarts server.js on file changes

Just run it in the directory where your server.js can be found.

To get the automatic reload working, do two things:

1. Include `if (process.send) process.send('online')` in the callback for your
server's listen method.
2. Include the following somewhere on the client side:

```js
(new EventSource('/_reload')).onmessage = function (e) {
  window.location.reload(true);
};
```

## install
npm install -g deva
