var fork = require('child_process').fork
var fs = require('fs')
var http = require('http')
var test = require('tap').test


var deva

test('setup', function (t) {
  deva = fork(__dirname + '/../../server', {cwd: __dirname, silent: true})

  // Give the server time to start up
  setTimeout(function () {
    t.end()
  }, 500)
})

test('server process responds to requests', function (t) {
  t.plan(2)
  http.get({port: 1028}, function (res) {
    t.equal(res.statusCode, 200, '200 on response')
    res.on('data', function (data) {
      t.equal(data.toString(), 'ok', 'ok on response')
    })
  })
})

test('modification of required file reloads child process', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/res.js', 'module.exports = function (res) {\n  res.end(\'okay\')\n}')

  // Give server time to reload
  setTimeout(function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'okay', 'okay on response')
      })
    })
  }, 1000)
})

test('return file to original state', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/res.js', 'module.exports = function (res) {\n  res.end(\'ok\')\n}')

  // Give server time to reload
  setTimeout(function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok', 'ok on response')
      })
    })
  }, 500)
})

test('teardown', function (t) {
  deva.kill()
  deva.on('exit', function () {t.end()})
  t.on('end', function () {setTimeout(process.exit, 500)})
})
