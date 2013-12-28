#!/usr/bin/env node
var detective = require('detective')
var fs = require('fs')
var fork = require('child_process').fork
var glob = require('glob')
var logstamp = require('logstamp')
var resolve = require('resolve')
var watcher = require('filewatcher')()

// Timestamp logs
logstamp(function () {return new Date().toISOString() + ' [deva] '})

function startServer () {
  console.log('Starting server.js')
  return fork('server.js', {env: process.env})
}
var child = startServer()

var cwd = process.cwd()
function watchRequires () {
  detective(fs.readFileSync('server.js')).forEach(function (name) {
    var p = resolve.sync(name, {basedir: cwd})
    if (p.indexOf(cwd) === 0) {
      p = p.substr(cwd.length + 1)
      watcher.add(p)
    }
  })
}

function watchStatic () {
  glob.sync('static/**').forEach(function (file) {
    watcher.add(file)
  })
}

function watchTemplates () {
  glob.sync('templates/**/*.html').forEach(function (file) {
    watcher.add(file)
  })
}

function watchAll () {
  console.log('Adding files to watcher')
  watcher.add('server.js')
  watchRequires()
  watchStatic()
  watchTemplates()
}
watchAll()

watcher.on('change', function (file, mtime) {
  console.log('Changed file:', file)
  if (child.connected) {
    console.log('Killing server.js')
    child.kill()
  }
  watcher.removeAll()
  setTimeout(function () {
    child = startServer()
    watchAll()
  }, 50)
})
