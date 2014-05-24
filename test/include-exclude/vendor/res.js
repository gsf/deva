var fs = require('fs')

module.exports = function (res) {
  res.end(fs.readFileSync(__dirname + '/../static/ok.txt'))
}
