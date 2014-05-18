var test = require('../wrapper')(__dirname)
var fs = require('fs')
var http = require('http')


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
