/*
  TODO: use AES for encryption of messages, use RSA for encryption of the AES key.... confusing as fuck ikr.
*/

sm.crypto = {}

sm.crypto.generateKeypair = function(cb) {
  forge.pki.rsa.generateKeyPair({bits: 2048, workers: -1}, function(err, pair) {
    cb(err, pair.publicKey, pair.privateKey);
  });
}

sm.crypto.md5 = function(data) {
  var md = forge.md.md5.create();
  md.update(data);
  return md.digest().toHex();
}

sm.crypto.exportKeys = function(publicKey, privateKey, password, cb) {
  var privateKey = forge.pki.privateKeyToPem(privateKey);
  var publicKey = forge.pki.publicKeyToPem(publicKey);

  sm.crypto.encryptPrivateKey(privateKey, password, function(err, encryptedKey) {
    cb(null, publicKey, encryptedKey);
  });
}

sm.crypto.importKeys = function(publicPem, privatePem, password, cb) {
  var publicKey;
  if (publicPem) {
    publicKey = forge.pki.publicKeyFromPem(publicPem);
  }

  sm.crypto.decryptPrivateKey(privatePem, password, function(err, key) {
    if (!key || key.indexOf("BEGIN RSA PRIVATE KEY") == -1) {
      return cb(new Error("Invalid username or password"));
    }

    var privateKey = forge.pki.privateKeyFromPem(key);

    cb(null, publicKey, privateKey);
  })
}

sm.crypto.rsaEncrypt = function(publicKey, data, cb) {
  var bytes = forge.util.encodeUtf8(data);

  var cipherText = publicKey.encrypt(bytes, "RSAES-PKCS1-V1_5", {
    md: forge.md.sha256.create(),
  });

  cb(null, forge.util.encode64(cipherText));
}

sm.crypto.rsaDecrypt = function(privateKey, data, cb) {
  data = forge.util.decode64(data);

  var plaintext = privateKey.decrypt(data, "RSAES-PKCS1-V1_5", {
    md: forge.md.sha256.create()
  });

  cb(null, plaintext);
}

sm.crypto.aesDecrypt = function(key, encrypted, cb) {
  var rawData = forge.util.decode64(encrypted);
  console.log("encrypted hash", sm.crypto.md5(rawData));

  var decipher = forge.cipher.createDecipher("AES-CBC", forge.util.decode64(key.key));
  decipher.start({iv: forge.util.createBuffer(forge.util.decode64(key.iv))});
  decipher.update(forge.util.createBuffer(rawData));
  decipher.finish();


  cb(null, decipher.output.data);
}

sm.crypto.decrypt = function(privateKey, data, dataKey, cb) {
  console.log("decrypting it")
  sm.crypto.rsaDecrypt(privateKey, dataKey, function(err, key) {
    if (key) {
      key = JSON.parse(key);

      console.log("key parsed")
      console.log(key)

      sm.crypto.aesDecrypt(key, data, function(err, message) {
        if (message) {
          cb(null, message);
        } else {
          cb(new Error("invalid decryption key"));
        }
      });
    }
  })
}

sm.crypto.encryptPrivateKey = function(privateKey, password, cb) {
  triplesec.encrypt({
    data: new triplesec.Buffer(privateKey),
    key: new triplesec.Buffer(password)
    // progress_hook: function(obj) {}
  }, function(err, buff) {
    var encryptedPrivate = buff.toString("base64");

    cb(null, encryptedPrivate);
  });
}

sm.crypto.decryptPrivateKey = function(privateKey, password, cb) {
  triplesec.decrypt({
    data: new triplesec.Buffer(privateKey, "base64"),
    key: new triplesec.Buffer(password)

  }, function(err, buff) {
    if (err || !buff) {
      return cb(new Error("Incorrect username or password"));
    }

    cb(null, buff.toString());
  });
}
