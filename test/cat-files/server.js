var fs = require('fs')
var http = require('http')


http.createServer(function (req, res) {
  fs.createReadStream(__dirname + '/static/files.txt').pipe(res)
}).listen(process.env.PORT, function () {
  if (process.send) process.send('online')
})
