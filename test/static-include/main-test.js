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

test('modification of static file reloads child process', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/static/index.txt', 'okay!')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'okay!', 'okay on response')
      })
    })
  })
})

test('return file to original state', function (t) {
  t.plan(1)
  fs.writeFileSync(__dirname + '/static/index.txt', 'ok')
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok', 'ok on response')
      })
    })
  })
})
