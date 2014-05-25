var fs = require('fs')
var http = require('http')
var test = require('../wrapper')(__dirname)


test('server process responds to requests', function (t) {
  t.plan(2)
  http.get({port: 1028}, function (res) {
    t.equal(res.statusCode, 200, '200 on response')
    res.on('data', function (data) {
      t.equal(data.toString(), 'ok1', 'ok1 response')
    })
  })
})

test('modifying script file cats to static and reloads child process', function (t) {
  t.plan(1)
  // Pause for command rerun interval
  setTimeout(function () {
    fs.writeFileSync(__dirname + '/files/b.txt', '2')
  }, 1000)
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok2', 'ok2 response')
      })
    })
  })
})

test('return script to original state', function (t) {
  t.plan(1)
  // Pause for command rerun interval
  setTimeout(function () {
    fs.writeFileSync(__dirname + '/files/b.txt', '1')
  }, 1000)
  test.server.once('online', function () {
    http.get({port: 1028}, function (res) {
      res.on('data', function (data) {
        t.equal(data.toString(), 'ok1', 'ok1 response')
      })
    })
  })
})
