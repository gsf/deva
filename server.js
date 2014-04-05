#!/usr/bin/env node
var detective = require('detective')
var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var fork = require('child_process').fork
var glob = require('glob')
var http = require('http')
var logstamp = require('logstamp')
var resolve = require('resolve')
var filewatcher = require('filewatcher')
var zlib = require('zlib')

// Stamp logs from this process
logstamp(function () {return '[deva] '})

var port = process.env.PORT || 1028;
var childPort = Math.floor(Math.random()*(Math.pow(2,16)-1024)+1024)
var childEnv = process.env
childEnv.PORT = childPort

// A long-lived thing to pass on messages from fleeting children
var dispatcher = new EventEmitter();

var child = {}
function startServer () {
  console.log('Starting server.js process')
  child = fork('server.js', {env: childEnv})
  child.on('message', function (m) {
    if (m == 'online') dispatcher.emit('childOnline')
  })
}

var cwd = process.cwd()
var watcher = filewatcher()
var watchSuccess = true
function watchRequires () {
  watcher.add('server.js')
  detective(fs.readFileSync('server.js')).forEach(function (name) {
    var p = resolve.sync(name, {basedir: cwd})
    //console.log(p)
    if (p.indexOf(cwd) === 0) {
      p = p.substr(cwd.length + 1)
      watcher.add(p)
    }
  })
}
watcher.on('change', function (file, mtime) {
  console.log('Changed file:', file)
  restart()
})

function restart () {
  if (child.connected) {
    console.log('Killing server.js process')
    child.kill()
  }
  watcher.removeAll()
  setTimeout(function () {
    watchAll()
    startServer()
  }, 50)
}

function watchAll () {
  try {
    watchRequires()
  } catch (e) {
    watchSuccess = false
    console.error(e.stack)
  }
  glob.sync('static/**').forEach(watcher.add, watcher)
  glob.sync('templates/**').forEach(watcher.add, watcher)
}

watchAll()
startServer()

// Reload on any console input
process.stdin.resume()
process.stdin.on('data', function (chunk) {
  restart()
})

// Hacky proxy
http.createServer(function(req, res) {
  if (RegExp('^/_reload').test(req.url)) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'close')
    dispatcher.on('childOnline', function () {
      res.write('data: reload\n\n')
    })
  } else {
    var clientReq = http.request({
      port: childPort,
      method: req.method,
      path: req.url,
      headers: req.headers
    }, function (clientRes) {
      res.writeHead(clientRes.statusCode, clientRes.headers)
      clientRes.pipe(res)
    })
    req.pipe(clientReq)
    clientReq.on('error', function (e) {console.error(e.message)})
  }
}).listen(port, function () {
  console.log('Listening on port', port)
})
