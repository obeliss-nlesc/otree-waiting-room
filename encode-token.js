const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKeyPath = './private-key.pem';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Replace these values with your actual data and private key file path
const userTemplate = {
  userId: '',
  experimentId: 'guess_two_thirds',
  headerText: 'In het gevangen dillema spel speelt u samen met 1 ander panellid. U wordt steeds gevraagd om een keuze te maken tussen samenwerken of tegenwerken. In totaal speelt u 10 rondes. Tijdens deze rondes veranderen er soms dingen, dit krijgt u steeds aan het begin van de ronde te zien.',
  meedoenValue: '€0,25',
  afrondenValue: '€2',
  bonusValue: '€0-2',
  oTreeVars: {
    age: 35,
    gender: 'f'
  }
};

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

const users = ['user001', 'user002', 'user003']

const userTokens = users.map(u => {
  const userData = clone(userTemplate)
  userData.userId = u
  return jwt.sign(userData, privateKey, {algorithm: 'RS256', expiresIn: '12h'})
})

userTokens.forEach(t => {
  console.log(`http://localhost:8060/room/guess_two_thirds?token=${t}`)
  console.log()
})
