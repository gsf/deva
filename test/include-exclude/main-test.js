var fs = require('fs')
var http = require('http')
var test = require('../wrapper')(__dirname)
var touch = require('touch')


test('server process responds to requests', function (t) {
  t.plan(2)
  http.get({port: 1028}, function (res) {
    t.equal(res.statusCode, 200, '200 on response')
    res.on('data', function (data) {
      t.equal(data.toString(), 'ok', 'ok on response')
    })
  })
})

test('touching vendor file does not restart process', function (t) {
  t.plan(1)
  //fs.writeFileSync(__dirname + '/vendor/res.js', 'module.exports = function (res) {\n  res.end(\'okay\')\n}')
  touch.sync(__dirname + '/vendor/res.js')
  http.get({port: 1028}, function (res) {
    res.on('data', function (data) {
      t.equal(data.toString(), 'ok', 'ok on response')
    })
  })
})

test('modifying static file reloads child process', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/static/ok.txt', 'okay')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'okay', 'okay on response')
      })
    })
  })
})

test('return static file to original state', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/static/ok.txt', 'ok')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok', 'ok on response')
      })
    })
  })
})
