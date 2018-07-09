const Router = require('koa-router')
const redirect = require('./helper/redirect')
const eleme = require('./eleme')
const logger = require('./helper/logger')

module.exports = (app) => {
	const router = new Router()

	router.post('/hongbao', async (ctx, next) => {
		try {
			let {url, mobile, nickname} = ctx.request.body
			console.log(ctx.request.body)

			if (!url || !mobile) {
				throw new Error('请将信息填写完整')
			}
			
			// 短链接处理
			if (/^https?:\/\/url\.cn\//i.test(url)) {
				url = await redirect(url)
			}
			
			if (!/^1\d{10}$/.test(mobile)) {
				throw new Error('请填写 11 位手机号码')
			}
			
			logger.info('开始抢红包', [url, mobile])
			
			if (url.indexOf('waimai.meituan.com') !== -1) {

				ctx.body = {message: '美团红包暂不支持'}

			} else if (url.indexOf('h5.ele.me/hongbao') !== -1) {
				ctx.body = await eleme({ mobile, url, nickname})

			}else {
				throw new Error('红包链接不正确')
			}
		} catch ({message}) {
			logger.error(message)
			ctx.body = {message}
		}
	})
	app.use(router.routes())
    app.use(router.allowedMethods())
	return router
}