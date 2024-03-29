class User {
  constructor(userId, experimentId) {
    this.userId = userId;
    this.experimentId = experimentId
    this.tokenParams = null;
    this.oTreeId = null;
    this.redirectedUrl = null;
    this.state = 'new';
    this.listeners = [];
    this.webSocket = null;
  }
  
  // DFA transition table
  transitionTable = {
    'new': ['startedPage'],
    'startedPage': ['queued', 'droppedOut'],
    'queued': ['queued', 'agreed', 'droppedOut'],
    'agreed': ['redirected', 'timedOut', 'queued', 'droppedOut'],
    'redirected': ["inoTreePages", "droppedOut" ],
    'inoTreePages': ["inoTreePages", "oTreeCompleted", "oTreeDroppedOut" ],
    'oTreeCompleted': ["final", "allowedBack", "droppedOut" ],
    'allowedBack': ["queued", "startedPage"],
    'oTreeDroppedOut': ["allowedBack", "nonAllowedBack"],
    'droppedOut': ["allowedBack", "nonAllowedBack"],
  };

  reset() {
    this.state = 'startedPage'
    this.listeners = []
    this.redirectedUrl = null
    this.oTreeId = null
    this.webSocket.emit('reset', {})
  }

  // Add a listener for a specific state change
  addListenerForState(state, listener) {
    if (!this.listeners[state]) {
      this.listeners[state] = [];
    }
    this.listeners[state].push(listener);
  }

  // Remove a listener for a specific state change
  removeListenerForState(state, listener) {
    if (this.listeners[state]) {
      const index = this.listeners[state].indexOf(listener);
      if (index !== -1) {
        this.listeners[state].splice(index, 1);
      }
    }
  }

  // Notify listeners when the state changes
  notifyListeners(newState) {
    if (this.listeners[newState]) {
      this.listeners[newState].forEach(listener => {
        listener(this, newState);
      });
    }
  }

  // Method to change the state
  changeState(action) {
    if (this.transitionTable[this.state] && this.transitionTable[this.state].includes(action)) {
      // Valid transition
      this.state = action;
      console.log(`${this.userId}'s state has been changed to ${this.state}`);
      this.notifyListeners(this.state); // Notify listeners about the state change
    } else {
      console.log('Invalid state transition. State not changed.');
    }
  }
}

module.exports = User
