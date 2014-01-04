#!/usr/bin/env node
var detective = require('detective')
var fs = require('fs')
var fork = require('child_process').fork
var glob = require('glob')
var http = require('http')
var logstamp = require('logstamp')
var resolve = require('resolve')
var filewatcher = require('filewatcher')
var watchify = require('watchify')

// Timestamp logs
logstamp(function () {return new Date().toISOString() + ' [deva] '})

var port = process.env.PORT || 1028;
var childPort = Math.floor(Math.random()*(Math.pow(2,16)-1024)+1024)
var childEnv = process.env
childEnv.PORT = childPort

// TODO Pool for multiple sseRes -- only one connection gets responses now
var sseRes;

var child = {}
function startServer () {
  console.log('Starting server.js')
  child = fork('server.js', {env: childEnv})
  child.on('message', function (m) {
    if (m == 'online' && sseRes) sseRes.write('data: reload\n\n')
  })
}

var w = watchify('./browser/main.js')
function bundle (cb) {
  console.log('Browserifying browser/main.js')
  var p = w.bundle({debug: true})
  var s = fs.createWriteStream('static/script.js')
  p.pipe(s)
  p.on('error', function (err) {
    console.error(err.stack)
  })
  if (cb) s.on('finish', cb)
}
w.on('update', function () {
  bundle()
})

var templateWatcher = filewatcher()
templateWatcher.on('change', function (file, mtime) {
  bundle()
})

var cwd = process.cwd()
var watcher = filewatcher()
var watchSuccess = true
function watchRequires () {
  detective(fs.readFileSync('server.js')).forEach(function (name) {
    var p = resolve.sync(name, {basedir: cwd})
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
    console.log('Killing server.js')
    child.kill()
  }
  unwatchAll()
  setTimeout(function () {
    watchAll()
    startServer()
  }, 50)
}

function watchAll () {
  console.log('Adding files to watcher')
  try {
    watchRequires()
  } catch (e) {
    watchSuccess = false
    console.error(e.stack)
  }
  watcher.add('server.js')
  glob.sync('static/**').forEach(watcher.add, watcher)
  glob.sync('templates/**').forEach(templateWatcher.add, templateWatcher)
}

function unwatchAll () {
  watcher.removeAll()
  templateWatcher.removeAll()
}

bundle(function () {
  watchAll()
  startServer()
})

// Reload on any console input
process.stdin.resume()
process.stdin.on('data', function (chunk) {
  restart()
})

// Hacky proxy
var server = http.createServer(function(req, res) {
  if (RegExp('^/_sse').test(req.url)) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'close')
    sseRes = res
  } else {
    var clientReq = http.request({
      port: childPort,
      method: req.method,
      path: req.url,
      headers: req.headers
    }, function (clientRes) {
      res.writeHead(clientRes.statusCode, clientRes.headers)
      // TODO Insert SSE reload <script> in HTML responses
      clientRes.pipe(res)
    })
    req.pipe(clientReq)
  }
})
server.listen(port)
