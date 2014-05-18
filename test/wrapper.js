// Tap-wrapping tester
var fork = require('child_process').fork
var tap = require('tap')


module.exports = function (cwd) {
  var deva
  var test = tap.test
  test('setup', function (t) {
    t.plan(1)
    deva = fork(cwd + '/../../server', {cwd: cwd, silent: true})
    deva.stderr.pipe(process.stderr)
    deva.on('message', function (m) {
      if (m == 'online') {
        t.ok(true, 'server online')
      }
    })
  })
  tap.on('end', function () {
    deva.kill()
    deva.on('exit', function () {setTimeout(process.exit, 500)})
  })
  return test
}
