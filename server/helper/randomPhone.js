const phones = require('../data/phones')

module.exports = () => phones[Math.floor(Math.random() * phones.length)]