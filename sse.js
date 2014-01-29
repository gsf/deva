var stream = require('stream')
var util = require('util')


util.inherits(InjectSse, stream.Transform)

function InjectSse (options) {
  stream.Transform.call(this, options)
}

InjectSse.prototype._transform = function (chunk, encoding, cb) {
  this.push(chunk.toString().replace('</body>', 
  '  <script>' +
    '(new EventSource("/_sse")).onmessage = function (e) {' +
      'if (e.data == "reload") window.location.reload()' +
    '}' +
  '</script>\n' +
  '  </body>'))
  cb()
}

exports.inject = function () {
  return new InjectSse()
}
