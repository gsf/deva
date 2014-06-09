// Tap-wrapping tester
var fork = require('child_process').fork
var tap = require('tap')


module.exports = function (cwd) {
  var test = tap.test
  test('setup', function (t) {
    t.plan(1)
    test.server = fork(__dirname + '/../server', {cwd: cwd, silent: true})
    test.server.on('message', function (m) {
      if (m == 'online') {
        test.server.emit('online')
      }
    })
    test.server.once('online', function () {t.ok(true, 'server online')})
  })
  tap.on('end', function () {
    test.server.kill()
    test.server.on('exit', function () {setTimeout(process.exit, 500)})
  })
  return test
}
