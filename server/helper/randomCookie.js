const cookies = require('../data/cookies')

module.exports = (bool) => {
	if (bool) {
		return cookies[Math.floor(Math.random() * cookies.length)]
	}
	return cookies[0]
}
