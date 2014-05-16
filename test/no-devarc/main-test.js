var fork = require('child_process').fork
var http = require('http')
var test = require('tap').test


var deva

test('setup', function (t) {
  deva = fork(__dirname + '/../../server', {cwd: __dirname})

  // Give the server time to start up
  setTimeout(function () {
    t.end()
  }, 500)
})

test('server process responds to requests', function (t) {
  t.plan(1)
  http.get({port: 1028}, function (res) {
    t.equal(res.statusCode, 200, '200 ok on response')
  })
})

test('teardown', function (t) {
  deva.kill()
  t.end()
})