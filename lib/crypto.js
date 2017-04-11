const forge = require("node-forge"),
  crypto = require("crypto");

exports.importPublicKey = function(publicPem, callback) {
  callback(null, forge.pki.publicKeyFromPem(publicPem));
}

exports.exportPublicKey = function(publicKey, callback) {
  callback(null, forge.pki.publicKeyToPem(publicKey));
}

exports.encryptRSA = function(publicKey, data, callback) {
  var bytes = forge.util.encodeUtf8(data);

  var cipherText = publicKey.encrypt(bytes, "RSAES-PKCS1-V1_5", {
    md: forge.md.sha256.create(),
  });

  callback(null, forge.util.encode64(cipherText));
}

exports.md5 = function(data) {
  var md = forge.md.md5.create();
  md.update(data);
  return md.digest().toHex();
}

exports.base64 = function(data) {
  return forge.util.encode64(data);
}

exports.encrypt = function(publicKey, data, cb) {
  let key = forge.random.getBytesSync(32),
    iv = forge.random.getBytesSync(32);


  let buffer = forge.util.createBuffer(data)
  let cipher = forge.cipher.createCipher("AES-CBC", key);
  cipher.start({iv: iv});
  cipher.update(buffer);
  cipher.finish();

  let encryptedData = cipher.output.data;

  let keyiv = JSON.stringify({
    key: forge.util.encode64(key),
    iv: forge.util.encode64(iv)
  });

  exports.encryptRSA(publicKey, keyiv, function(err, encryptedKey) {
    cb(null, encryptedData, encryptedKey);
  })
}

exports.randomBytes = crypto.randomBytes;
