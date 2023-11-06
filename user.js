class User {
  constructor(name) {
    this.name = name;
    this.state = 'new'; // Initial state is 'active'
    this.listeners = [];
  }
  
  // DFA transition table
  transitionTable = {
    'new': ['startedPage'],
    'startedPage': ['queued', 'dropedout'],
    'queued': ['agreed', 'dropedout'],
    'agreed': ['redirected', 'timedOut', 'queued', 'dropedout'],
    'redirected': ["inoTreePages", "dropedout" ],
    'inoTreePages': ["inoTreePages", "oTreeCompleted", "oTreeDropedout" ],
    'oTreeCompleted': ["final", "allowedBack", "dropedout" ],
    'allowedBack': ["queued", "startedPage"],
    'oTreeDropedout': ["allowedBack", "nonAllowedBack"],
    'dropedout': ["allowedBack", "nonAllowedBack"],
  };

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
        listener(this.name, newState);
      });
    }
  }

  // Method to change the state
  changeState(action) {
    const oldState = this.state;
    if (this.transitionTable[this.state] && this.transitionTable[this.state].includes(action)) {
      // Valid transition
      this.state = action;
      console.log(`${this.name}'s state has been changed to ${this.state}`);
      this.notifyListeners(this.state); // Notify listeners about the state change
    } else {
      console.log('Invalid state transition. State not changed.');
    }
  }
}

module.exports = User

