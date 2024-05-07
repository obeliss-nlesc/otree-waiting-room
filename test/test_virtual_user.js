const VirtualUser = require('./virtual-user-ws')

vu01 = new VirtualUser("01234", "public_goods_game", "http://localhost:8060")
vu02 = new VirtualUser("05678", "public_goods_game", "http://localhost:8060")
vu03 = new VirtualUser("91011", "public_goods_game", "http://localhost:8060")

vu01.connect().then(() => {
  vu01.attemptNormalQueueFlow()
})
vu02.connect().then(() => {
  vu02.attemptNormalQueueFlow()
})
vu03.connect().then(() => {
  vu03.attemptNormalQueueFlow()
})
