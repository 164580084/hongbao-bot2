const axios = require('axios')
const querystring = require('querystring')
const randomCookie = require('../helper/randomCookie')
const randomPhone = require('../helper/randomPhone')
const logger = require('../helper/logger')
const timeout = require('../helper/timeout')
const checkMobile = require('../helper/checkMobile')
const origin = 'https://h5.ele.me'

async function request({ mobile, url, nickname }) {
    let index = -1
    let luckIndex = 0   //下一个就是最大红包领取次数
    const query = querystring.parse(url)

    let request = axios.create({
        baseURL: origin,
        withCredentials: true,
        headers: {
            origin,
            'content-type': 'text/plain;charset=UTF-8',
            referer: `${origin}/hongbao/`,
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; PRO 6 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043221 Safari/537.36 V1_AND_SQ_7.0.0_676_YYB_D QQ/7.0.0.3135 NetType/WIFI WebP/0.3.0 Pixel/1080'
        },
        transformRequest: [(data, headers) => {
            headers['X-Shard'] = `eosid=${parseInt(query.sn, 16)}`
            return JSON.stringify(data)
        }],
    })

    return (async function lottery(phone) {
        let cookie = {}
        if (index >= 18) {
            return '领取失败，系统资源不足(cookie或手机号)或者其他未知原因'
        }else if (index === -1) {
            cookie = randomCookie(false)
        }else {
            cookie = randomCookie(true)
        }

        if (!query.sn || !query.lucky_number || isNaN(query.lucky_number)) {
            throw new Error('饿了么红包链接不正确')
        }
        phone = phone || randomPhone()
        //如果这个是最大红包等一会
        if (phone === mobile) {
            luckIndex++
            await timeout(3000)
        }

        //用户绑定手机号
        await request.put(`/restapi/v1/weixin/${cookie.openid}/phone`, { sign: cookie.eleme_key, phone })
        logger.info('绑定手机号', phone)
        // 领红包
        const { data } = await request.post(`/restapi/marketing/promotion/weixin/${cookie.openid}`, {
            device_id: '',
            group_sn: query.sn,
            hardware_id: '',
            method: 'phone',
            phone,
            platform: query.platform,
            sign: cookie.eleme_key,
            track_id: '',
            unionid: 'fuck',
            weixin_avatar: "",
            weixin_username: ""
        })

        if (luckIndex >=4 ) {
          return `你的账号可能已经达到五次限制，系统无法帮你领取，请点开红包手动领取`
        }

        //=========================最大红包已被领取============================
        if (query.lucky_number - data.promotion_records.length <= 0) {
            const lucky = data.promotion_records[query.lucky_number - 1];

            // 还是取不到，可能是因为领完了，不会返回数组了
            if (!lucky) {
                return `大红包已被领取`
            }

            if (checkMobile(mobile, lucky.sns_username)) {
                if (index > -1) {
                    return `恭喜你${nickname}获得手气最佳😍\n手气最佳: ${lucky.sns_username}\n红包金额：${lucky.amount}元`
                }

                return `这个手气最佳你已经领过了\n手气最佳: ${lucky.sns_username}\n红包金额：${lucky.amount}元`
            }
            return `手气最佳被人截胡了😥\n手气最佳: ${lucky.sns_username}\n红包金额：${lucky.amount} 元`
        }

        //========================判断用户有没有领过这个红包=====================
        const records_item = data.promotion_records.find((r) => {
            return r.sns_username === nickname || checkMobile(mobile, r.sns_username)
        })

        if (records_item) {
            return `你已经领过这个红包了\n领取账号:${records_item.sns_username}\n红包金额：${records_item.amount} 元`
        }
        // 计算剩余第几个为最佳红包
        const number = query.lucky_number - data.promotion_records.length
        logger.info(`还要领 ${number} 个红包才是手气最佳`)
        index++

        // 如果这个是最佳红包，换成指定的手机号领取
        if (number === 1) {
            return lottery(mobile)
        }
        return lottery(null)
    })()
}

function response(options) {
    return new Promise(async resolve => {
        try {
            resolve({ message: await request(options) })
        } catch (e) {
            logger.error(e.message)
            resolve({ err_code: 1, message: e.message, status: (e.response || {}).status })
        }
    })
}

module.exports = async options => {
    let res = await response(options)
    // 400 重试一次
    if (res.status === 400) {
        logger.error("出现400挂起等待1秒")
        res = await response(options)
        // 仍然 400
        if (res.status === 400) {
            res.message = '服务器繁忙,请稍后再试'
        }
    }
    return res
}