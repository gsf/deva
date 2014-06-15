#!/usr/bin/env node
var detective = require('detective')
var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var cp = require('child_process')
var glob = require('glob')
var http = require('http')
var ini = require('ini')
var logstamp = require('logstamp')
var resolve = require('resolve')


// Stamp logs from this process
logstamp(function () {return '[deva] '})

var child = null
var cwd = process.cwd()
var online = false

// A long-lived thing to pass messages from fleeting children
var dispatcher = new EventEmitter()

function debug () {
  process.env.DEVA_DEBUG && console.log.apply(this, arguments)
}

function loadConfig (file) {
  return fs.existsSync(file) && ini.parse(fs.readFileSync(file, 'utf8'))
}

function multiGlob (globs) {
  // Take space-separated globs and return all files
  globs = globs || ''
  var files = []
  globs.split(/\s+/).filter(Boolean).forEach(function (x) {
    files = files.concat(glob.sync(x))
  })
  return files
}

function watchFile (file, cb) {
  debug('Watching file:', file)
  fs.watch(file, function () {
    debug('File changed:', file)
    cb()
  })
}

function includeWatch (globs, excluded, cb) {
  multiGlob(globs).forEach(function (p) {
    if (excluded.indexOf(p) == -1) watchFile(p, cb)
  })
}

var config = loadConfig('.devarc') ||
  loadConfig(process.env.HOME + '/.devarc') || {}
debug('Parsed config:', config)

var commandRunning = false
// Handle config sections
Object.keys(config).forEach(function (key) {
  var val = config[key]
  var cb
  var lastRun = 0
  if (val.command) {
    cb = function () {
      if (commandRunning) return
      commandRunning = true

      debug('Running', '"' + val.command + '"')

      cp.exec(val.command, {env: process.env}, function (err, stdout, stderr) {
        if (err) process.stderr.write('[deva:'+key+'] '+err)
        if (stdout) process.stdout.write('[deva:'+key+'] '+stdout)
        if (stderr) process.stderr.write('[deva:'+key+'] '+stderr)

        commandRunning = false
        scheduleRestart()
      })
    }
    includeWatch(val.include, multiGlob(val.exclude), cb)
    cb()
  }
})

var port = process.env.PORT || config.port || 1028
var childPort = Math.floor(Math.random()*(Math.pow(2,16)-1024)+1024)
var childEnv = process.env
childEnv.PORT = childPort

var runFile = config.runfile ? config.runfile.trim() : 'server.js'

function watch () {
  var excluded = multiGlob(config.exclude)
  watchFile(runFile, scheduleRestart)
  detective(fs.readFileSync(runFile)).forEach(function (name) {
    var p = resolve.sync(name, {basedir: cwd})
    if (p.indexOf(cwd) === 0) {
      p = p.substr(cwd.length + 1)
      if (excluded.indexOf(p) == -1) watchFile(p, scheduleRestart)
    }
  })

  if (config.include) includeWatch(config.include, excluded, scheduleRestart)
}

dispatcher.on('online', function () {
  online = true
  // Pass the online message up for testing
  if (process.send) process.send('online')
})

function start () {
  console.log('Starting ' + runFile + ' child process')
  child = cp.fork(runFile, {env: childEnv})
  child.on('message', function (m) {
    if (m == 'online') {
      debug('Child online')
      dispatcher.emit('online')
    }
  })
  child.once('exit', function () {
    child = null
  })
}

function stop () {
  console.log('Killing ' + runFile + ' child process')
  online = false
  child.kill()
}

var scheduledAt = 0
function scheduleRestart () {
  // Throttling: wait a second before restart and reset timer each time
  scheduledAt = new Date()
  setTimeout(restart, 1000)
}

function restart () {
  if ((new Date()) - scheduledAt < 1000) {
    return
  }
  if (child) {
    // Avoid overlaps in restarting
    if (!online) return

    // Wait for command callback if file changes triggered by command
    if (commandRunning) return

    child.once('exit', start)
    stop()
  }
  else {
    // Child already stopped
    start()
  }
}

// Cleanup when kill signal received
process.on('SIGTERM', function () {
  if (child) child.kill()
  process.exit()
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
    return
  }
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
  clientReq.on('error', function (e) {
    console.error(e.message)
    res.writeHead(502)
    res.end('Error reaching proxied server')
  })
}).listen(port, function () {
  console.log('Listening on port', port)
  watch()
  start()
})
