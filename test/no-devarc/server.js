var http = require('http')


http.createServer(function (req, res) {
  res.end('ok')
}).listen(process.env.PORT, function () {
  if (process.send) process.send('online')
})