// Tap-wrapping tester
var fork = require('child_process').fork
var tap = require('tap')


module.exports = function (cwd) {
  var deva
  var test = tap.test
  test('setup', function (t) {
    deva = fork(cwd + '/../../server', {cwd: cwd, silent: true})
    deva.stderr.pipe(process.stderr)

    // Give the server time to start up
    setTimeout(function () {
      t.end()
    }, 500)
  })
  tap.on('end', function () {
    deva.kill()
    deva.on('exit', function () {setTimeout(process.exit, 500)})
  })
  return test
}
