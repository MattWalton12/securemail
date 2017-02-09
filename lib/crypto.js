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

exports.encrypt = function(publicKey, data, callback) {
  let key = forge.random.getBytesSync(32),
    iv = forge.random.getBytesSync(32);

  let cipher = forge.cipher.createCipher("AES-CBC", key);
  cipher.start({iv: iv});
  cipher.update(forge.util.createBuffer(data));
  cipher.finish();

  let encryptedData = forge.util.encode64(cipher.output.data);

  let keyiv = JSON.stringify({
    key: forge.util.encode64(key),
    iv: forge.util.encode64(iv)
  });

  exports.encryptRSA(publicKey, keyiv, function(err, encryptedKey) {
    cb(null, encryptedData, encryptedKey);
  })
}

exports.randomBytes = crypto.randomBytes;
