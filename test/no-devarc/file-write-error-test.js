var fs = require('fs')
var http = require('http')
var test = require('../wrapper')(__dirname)


test('server process responds to requests', function (t) {
  t.plan(2)
  http.get({port: 1028}, function (res) {
    t.equal(res.statusCode, 200, '200 on response')
    res.on('data', function (data) {
      t.equal(data.toString(), 'ok', 'ok on response')
    })
  })
})

test('write with syntax error results in 500 response', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/res.js', 'module.exports = function (res) }\n  res.end(\'okay\')\n}')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      t.equal(res.statusCode, 500, '500 on response')
    })
  })
})

test('return file to original state reloads server', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/res.js', 'module.exports = function (res) {\n  res.end(\'ok\')\n}')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok', 'ok on response')
      })
    })
  })
})
