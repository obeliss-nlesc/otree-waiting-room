const apiKey = pm.environment.get('apiKey'); 

if(!apiKey){
  pm.request.headers.add({ key: 'X-Signature', value: 'NOKEY' });
} else {
  // Replace with the data you want to sign
  const dataToSign = JSON.stringify(JSON.parse(pm.request.body.raw))
  const keyWordArray = CryptoJS.enc.Base64.parse(apiKey);

  // Convert the data to a WordArray
  const dataWordArray = CryptoJS.enc.Utf8.parse(dataToSign);

  const signatureWordArray = CryptoJS.HmacSHA256(dataWordArray, keyWordArray);

  // Convert the signature to a Base64-encoded string
  const signatureBase64 = CryptoJS.enc.Base64.stringify(signatureWordArray);

  // Add the signature to the request headers or body, depending on your requirements
  pm.request.headers.add({ key: 'X-Signature', value: signatureBase64 });
}
