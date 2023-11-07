class Agreement {
  constructor(agreementId, experimentId, users, urls, server) {
    this.agreementId = agreementId
    this.experimentId = experimentId
    this.users = users
    this.agreedUsers = []
    this.urls = urls
    this.server = server
    this.state = 'new'
    this.timeout = 10
  }

  startTimeout(fn) {
    setTimeout(() => {
      if (this.isAgreed()) {
        return
      }
      console.log(`Agreement ${this.agreementId} timeout!`)
      const nonAgreedUsers = this.users.filter(user => {
        return (!this.agreedUsers.includes(user))
      })
      if(nonAgreedUsers.length > 0) {
        this.state = 'broken'
        fn(this, this.agreedUsers, nonAgreedUsers)
      }
    }, this.timeout * 1000)
  }

  breakAgreement() {
    this.state = 'broken'
  }

  isBroken() {
    return (this.state == 'broken')
  }

  isAgreed() {
    return (this.state == 'agreed')
  }

  agree(userId) {
    if (this.state == 'broken') {
      console.error(`Agreement ${this.agreementId} in broken state!`)
      return false
    }
    if (this.agreedUsers.includes(userId) && this.state == 'agreed'){
      return true
    }
    if (this.agreedUsers.includes(userId)){
      return false
    }
    this.agreedUsers.push(userId)
    this.state = 'inProgress'
    if(this.agreedUsers.length == this.users.length) {
      this.state = 'agreed'
      return true
    }
    return false
  }

}  

module.exports = Agreement
