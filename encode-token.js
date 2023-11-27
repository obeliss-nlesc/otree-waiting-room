const jwt = require('jsonwebtoken');
const fs = require('fs');

// Replace these values with your actual data and private key file path
const payload = {
  userId: 'user001',
  headerText: 'In het gevangen dillema spel speelt u samen met 1 ander panellid. U wordt steeds gevraagd om een keuze te maken tussen samenwerken of tegenwerken. In totaal speelt u 10 rondes. Tijdens deze rondes veranderen er soms dingen, dit krijgt u steeds aan het begin van de ronde te zien.',
  meedoenValue: '€0,25',
  afrondenValue: '€2',
  bonusValue: '€0-2',
};

const privateKeyPath = './private-key.pem';

// Read the RSA private key from the file
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Encode the token with the private key
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

console.log('Encoded Token:', token);

