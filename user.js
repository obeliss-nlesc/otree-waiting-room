class User {
  constructor(userId, experimentId) {
    this.userId = userId
    this.experimentId = experimentId
    this.tokenParams = null
    this.oTreeId = null
    this.redirectedUrl = null
    this.experimentUrl = null
    this.groupId = null
    this.state = "new"
    this.listeners = []
    this.webSocket = null
    this.timestamp = new Date().toISOString()
  }

  serialize() {
    return {
      userId: this.userId,
      experimentId: this.experimentId,
      redirectedUrl: this.redirectedUrl,
      groupId: this.groupId,
      experimentUrl: this.experimentUrl,
      state: this.state,
      oTreeId: this.oTreeId,
      tokenParams: this.tokenParams,
      timestamp: this.timestamp,
    }
  }

  // DFA transition table
  transitionTable = {
    new: ["startedPage"],
    startedPage: ["startedPage", "queued", "droppedOut"],
    queued: ["queued", "agreed", "droppedOut", "waitAgreement"],
    waitAgreement: ["waitAgreement", "queued", "agreed"],
    agreed: ["agreed", "redirected", "timedOut", "queued", "droppedOut"],
    redirected: ["inoTreePages", "droppedOut"],
    inoTreePages: ["inoTreePages", "oTreeCompleted", "oTreeDroppedOut"],
    oTreeCompleted: ["final", "allowedBack", "droppedOut"],
    allowedBack: ["queued", "startedPage"],
    oTreeDroppedOut: ["allowedBack", "nonAllowedBack"],
    droppedOut: ["allowedBack", "nonAllowedBack"],
  }

  reset(x) {
    if (this.state === "inoTreePages") {
      console.log(`${x} WARNING resetting ${JSON.stringify(this.serialize(), null, 2)}`)
    }
    this.state = "startedPage"
    this.timestamp = new Date().toISOString()
    this.listeners = []
    this.redirectedUrl = null
    this.oTreeId = null
    this.webSocket.emit("reset", {})
  }

  // Add a listener for a specific state change
  addListenerForState(state, listener) {
    if (!this.listeners[state]) {
      this.listeners[state] = []
    }
    this.listeners[state].push(listener)
  }

  // Remove a listener for a specific state change
  removeListenerForState(state, listener) {
    if (this.listeners[state]) {
      const index = this.listeners[state].indexOf(listener)
      if (index !== -1) {
        this.listeners[state].splice(index, 1)
      }
    }
  }

  // Notify listeners when the state changes
  notifyListeners(newState) {
    if (this.listeners[newState]) {
      this.listeners[newState].forEach((listener) => {
        listener(this, newState)
      })
    }
  }

  // Method to change the state
  changeState(action) {
    if (
      this.transitionTable[this.state] &&
      this.transitionTable[this.state].includes(action)
    ) {
      // Valid transition
      this.state = action
      this.timestamp = new Date().toISOString()
      //console.log(`${this.userId}'s state has been changed to ${this.state}`)
      this.notifyListeners(this.state) // Notify listeners about the state change
    } else {
      console.log(`[${this.userId}] Invalid state transition. ${this.state} -> ${action}. State not changed.`)
    }
  }
}

module.exports = User
