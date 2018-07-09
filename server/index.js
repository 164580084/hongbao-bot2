const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('koa2-cors')
const Router = require('./router')
const app = new Koa()

app
.use(cors())
.use(bodyParser())

Router(app)

app.listen(3000)
