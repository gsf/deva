var http = require('http')

http.createServer(function (req, res) {
  require('./vendor/res.js')(res)
}).listen(process.env.PORT, function () {
  if (process.send) process.send('online')
})
