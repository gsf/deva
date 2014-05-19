#!/usr/bin/env node
var detective = require('detective')
var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var fork = require('child_process').fork
var glob = require('glob')
var http = require('http')
var ini = require('ini')
var logstamp = require('logstamp')
var resolve = require('resolve')
var filewatcher = require('filewatcher')
var zlib = require('zlib')


// Stamp logs from this process
logstamp(function () {return '[deva] '})

var child = {}
var cwd = process.cwd()
var watcher = filewatcher()

// A long-lived thing to pass messages from fleeting children
var dispatcher = new EventEmitter();

function loadConfig (file) {
  return fs.existsSync(file) && ini.parse(fs.readFileSync(file, 'utf8'))
}

function multiGlob (globs) {
  // Take space-separated globs and return all files
  var files = []
  globs.split(/\s+/).filter(Boolean).forEach(function (x) {
    files = files.concat(glob.sync(x))
  })
  return files
}

var config = loadConfig('.devarc') ||
  loadConfig(process.env.HOME + '/.devarc') || {}

var port = process.env.PORT || config.port || 1028;
var childPort = Math.floor(Math.random()*(Math.pow(2,16)-1024)+1024)
var childEnv = process.env
childEnv.PORT = childPort

var startFile = config.file ? config.file.trim() : 'server.js'

function requireWatch (file) {
  console.log('Adding files in require tree for ' + file + ' to watcher')
  watcher.add(file)
  detective(fs.readFileSync(file)).forEach(function (name) {
    var p = resolve.sync(name, {basedir: cwd})
    if (p.indexOf(cwd) === 0) {
      p = p.substr(cwd.length + 1)
      watcher.add(p)
    }
  })
}

function includeWatch (globs) {
  console.log('Adding files in "' + globs + '" to watcher')
  multiGlob(globs).forEach(watcher.add, watcher)
}

function watch () {
  if (config.require === undefined) requireWatch(startFile)
  else if (config.require) requireWatch(config.require)

  if (config.include) includeWatch(config.include)
}

function start (cb) {
  cb = cb || function () {}
  console.log('Starting ' + startFile + ' process')
  child = fork(startFile, {env: childEnv})
  child.on('message', function (m) {
    if (m == 'online') {
      dispatcher.emit('online')
      // Pass the online message up for testing
      if (process.send) process.send('online')
    }
  })
}

function restart () {
  if (child.connected) {
    console.log('Killing ' + startFile + ' process')
    child.on('exit', start)
    child.kill()
  } else {
    start()
  }
}

// Reload on any console input
process.stdin.resume()
process.stdin.on('data', function (chunk) {
  restart()
})

watcher.on('change', function (file, mtime) {
  console.log('Changed file:', file)
  restart()
})

// Hacky proxy
http.createServer(function(req, res) {
  if (RegExp('^/_reload').test(req.url)) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'close')
    dispatcher.once('online', function () {
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
  watch()
  start()
})
