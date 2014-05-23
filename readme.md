# deva

## about
deva does the following:

1. starts server.js
2. restarts server.js on file changes

Just run it in the directory where your server.js can be found.

To get the automatic reload working, do two things:

1. Include `if (process.send) process.send('online')` in the callback for your server's listen method.
2. Include the following somewhere on the client side (or simply `require('deva')` with browserify):

```js
(new EventSource('/_reload')).onmessage = function (e) {
  window.location.reload(true);
};
```

## install
npm install -g deva

## 1028
The default port for deva, 1028, can be overridden with a port variable in the
global section of the config file or with a PORT environment variable. 1028 was
chosen to match the number of hymns in the Rig Veda. Apologies if that port is
already used by Windows DCOM on your system.
