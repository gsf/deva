#!/usr/bin/env node
var detective = require('detective')
var fs = require('fs')
var fork = require('child_process').fork
var glob = require('glob')
var logstamp = require('logstamp')
var resolve = require('resolve')
var filewatcher = require('filewatcher')
var watchify = require('watchify')

// Timestamp logs
logstamp(function () {return new Date().toISOString() + ' [deva] '})

var child = {}
function startServer () {
  console.log('Starting server.js')
  child = fork('server.js', {env: process.env})
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
  var requires = []
  try {
    requires = detective(fs.readFileSync('server.js'))
  } catch (e) {
    watchSuccess = false
    console.error(e.stack)
  }
  requires.forEach(function (name) {
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
  watchRequires()
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

process.stdin.resume()
process.stdin.setEncoding('utf8')
process.stdin.on('data', function (chunk) {
  restart()
})
