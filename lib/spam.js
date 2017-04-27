const database = require("./database.js"),
  fs = require("fs"),
  log = require("./log.js"),
  config = require("./../config.json"),
  crypto = require("crypto"),
  mime = require("./mime.js")

function removeStopWords(wordList) {
  const stopWords = fs.readFileSync("stopwords.txt").toString().split("\n");
  // thanks to http://www.ranks.nl/stopwords for stopwords
  for (var i=wordList.length-1; i>=0; i--) {
    if (stopWords.indexOf(wordList[i]) > -1)
      wordList.splice(i, 1)
  }

  return wordList
}

function getWordList(email) {
  email = email.toLowerCase().trim()
  email = email.replace(new RegExp("[^a-z ]", "g"), "")

  let wordList = email.split(" ")

  // clean word list of empties

  for (var i=wordList.length-1; i>= 0; i--) {
    if (wordList[i].trim() == "")
      wordList.splice(i, 1)
    else if (wordList[i].length > 15)
      wordList.splice(i, 1)
  }



  wordList = removeStopWords(wordList)

  return wordList

}

const preferredTypes = ["text/html", "text/plain"]

function getEmailDisplays(data, callback) {
  mime.process(data, function(err, data) {
    let displays = []

    function recursiveSearch(obj, cb) {
      if (obj.children) {
        var i = 0

        function go() {
          if (obj.children[i]) {
            recursiveSearch(obj.children[i], function() {
              i++;
              go();
            })
          } else {
            cb()
          }
        }

        go()

      } else {

        if (!obj.body || !obj.headers["content-type"]) {
          return cb();
        }

        var type = obj.headers["content-type"].split(";")[0].trim()

        if (preferredTypes.indexOf(type) == -1) {
          return cb()
        }

        displays.push({
          type: type,
          body: obj.body
        })

        cb()
      }
    }

    recursiveSearch(data, function() {
      displays.sort(function(a, b) {
        if (a.type == preferredTypes[0]) {
          return -1
        } else {
          return 1
        }
      })

      callback(null, displays)
    })
  })
}

let trainingData = {}

function processEmail(data, cb) {
  getEmailDisplays(data, function(err, displays) {
    if (displays[0]) {
      data = displays[0].body
      if (displays[0].type == "text/html") {
        data = data.replace(new RegExp("(<([^>]+)>)|(&lt;([^>]+)&gt;)", "ig"), "")
      }

      let wordList = getWordList(data)
      cb(null, wordList)
    } else {
      cb(null, [])
    }
  });
}

function trainEmail(path, spam) {
  return new Promise(function(resolve, reject) {
    let data = fs.readFileSync("training_data/" + path).toString()
    data = data.replace(new RegExp("\n", "g"), "\r\n")

    if (path.indexOf(".txt") > -1) {
      data = "headers\r\n\r\n" + data
    }

    processEmail(data, function(err, wordList) {
      for (var i=0; i<wordList.length; i++) {
        if (!trainingData[wordList[i]]) {
          trainingData[wordList[i]] = {spam: 0, ham:0}
        }

        if (spam) {
          trainingData[wordList[i]].spam++
        } else {
          trainingData[wordList[i]].ham++
        }
      }

      resolve()
    })
  })
}

function processRawData(data) {
  let keys = Object.keys(data)
  let output = {}

  for (var i=0; i<keys.length; i++) {
    let count = data[keys[i]].spam + data[keys[i]].ham

    if (count > 10) {
      output[keys[i]] = data[keys[i]]
    }
  }

  return output
}

function hashData(data) {
  let out = {}

  let keys = Object.keys(data)
  for (var i=0; i<keys.length; i++) {
    if (data[keys[i]] == 1 || data[keys[i]] == 0) continue
    out[generateWordHash(keys[i])] = data[keys[i]]
  }

  return out
}

function updateSpamIndex(data) {
  data = hashData(data)

  database.query("SELECT * FROM spam_words", function(err, results) {
    let updates = [];

    for (var i=0; i<results.length; i++) {
      if (data[results[i].word]) {
        data[results[i].word].spam += results[i].spam_instances
        data[results[i].word].ham += results[i].ham_instances

        updates.push(results[i].word)
      }
    }

    let keys = Object.keys(data)

    let count = 0;
    for (var i=0; i<keys.length; i++) {
      if (updates.indexOf(keys[i]) == -1) {
        database.query("INSERT INTO spam_words(word, spam_instances, ham_instances) VALUES(?, ?, ?)", [keys[i], data[keys[i]].spam, data[keys[i]].ham])
        count++;
      } else {
        database.query("UPDATE spam_words SET spam_instances=?, ham_instances=? WHERE word=?", [data[keys[i]].spam, data[keys[i]].ham, keys[i]])
      }
    }


    log.info("Successfully inserted " + count + " spam words")


  })
}


function generateWordHash(word) {
    const hash = crypto.createHash("rmd160")
    hash.update(word)
    return hash.digest("base64")
}

exports.train = function() {
  trainingData = {}
  let hamFiles = fs.readdirSync("training_data/ham")
  log.info("Starting spam filter training process...")
  log.info("Processing " + hamFiles.length + " HAM examples")

  let hamPromises = []
  for (var i=0; i<hamFiles.length; i++) {
    if (hamFiles[i] == "._DS_Store") continue

    hamPromises.push(trainEmail("ham/" + hamFiles[i], false))
  }

  Promise.all(hamPromises).then(function() {
    log.info("Successfully processed HAM")

    let spamFiles = fs.readdirSync("training_data/spam")
    log.info("Processing " + spamFiles.length + " spam examples")

    let spamPromises = []
    for (var i=0; i<spamFiles.length; i++) {
      if (spamFiles[i] == "._DS_Store") continue

      spamPromises.push(trainEmail("spam/" + spamFiles[i], true))
    }

    Promise.all(spamPromises).then(function() {
      log.info("Successfully processed spam")

      let output = processRawData(trainingData)
      updateSpamIndex(output)
    })
  })
}

exports.spamIndex = {}

exports.load = function() {
  database.query("SELECT * FROM spam_words", function(err, results) {
    for (var i=0; i<results.length; i++) {
      exports.spamIndex[results[i].word] = {score: (results[i].spam_instances / (results[i].spam_instances + results[i].ham_instances)), id: results[i].id, spam: results[i].spam_instances, ham: results[i].ham_instances}
      if (exports.spamIndex[results[i].word].score != exports.spamIndex[results[i].word].score || exports.spamIndex[results[i].word].score == 0 || exports.spamIndex[results[i].word].score == 1)
        delete exports.spamIndex[results[i].word]
    }

    log.info("Loaded spam index")
  })
}

function calculateSpamProbability(email, cb) {
  processEmail(email, function(err, wordList) {
    let matches = []

    for (var i=0; i<wordList.length; i++) {
      let hash = generateWordHash(wordList[i])
      if (exports.spamIndex[hash])
        matches.push(exports.spamIndex[hash])
    }

    let spamProbability = 0.5
    if (matches.length > 0) {

      let probabilityProduct = matches[0].score
      let antiProbabilityProduct = (1 - matches[0].score)

      for (var i=1; i<matches.length; i++) {
        probabilityProduct = probabilityProduct * matches[i].score
        antiProbabilityProduct = antiProbabilityProduct * (1 - matches[i].score)
      }

      spamProbability = probabilityProduct/(probabilityProduct + antiProbabilityProduct)
    }

    cb(null, spamProbability, wordList)

  })
}

function processFile(path) {
  return new Promise(function(resolve) {
    var data = fs.readFileSync("training_data/" + path).toString().replace(new RegExp("\n", "g"), "\r\n")
    if (path.indexOf(".txt") > -1) {
      data = "headers \r\n\r\n" + data
    }

    calculateSpamProbability(data, function(err, score) {
      if (score == score && score > 0 && score < 1) {
        resolve(score)
      } else {
        resolve()
      }
    })
  })
}

exports.calibrate = function() {
  log.info("Calibrating spam filter...")
  let spamEmails = fs.readdirSync("training_data/spam")
  let spamPromises = []

  for (var i=0; i<spamEmails.length; i++) {
    if (spamEmails[i] != ".DS_Store") {
      spamPromises.push(processFile("spam/" + spamEmails[i]))
    }
  }

  Promise.all(spamPromises).then(function(spamScores) {
    spamScores = spamScores.filter(function(n) {
      return n != undefined
    })

    let hamEmails = fs.readdirSync("training_data/ham")
    let hamPromises = []

    for (var i=0; i<hamEmails.length; i++) {
      if (hamEmails[i] != ".DS_Store") {
        hamPromises.push(processFile("ham/" + hamEmails[i]))
      }
    }

    Promise.all(hamPromises).then(function(hamScores) {
      hamScores = hamScores.filter(function(n) {
        return n != undefined
      })

      let falsePositive = 0
      let threshold = 0.999
      while (falsePositive < 0.0075) {
        falsePositive = (hamScores.filter(function(n) {
          return n > threshold
        }).length / hamScores.length)

        threshold -= 0.00001
      }

      log.info("Found lowest threshold: " + threshold)
      log.info("False positive rate: " + (falsePositive * 100) + "%")

      let success = spamScores.filter(function(n) {
        return n > threshold
      })

      log.info("Success rate: " + (success.length / spamScores.length) * 100 + "%")
    })
  })
}

exports.process = function(email, id, address, userid) {
  log.info("Checking email #" + id + " for spam")
  calculateSpamProbability(email, function(err, probability, wordList) {
    let isSpam = false
    if (probability > config.spamFilterThreshold) {
      isSpam = true
    }

    database.query("SELECT * FROM spam_blacklist WHERE email=? AND userid=?", [address, userid], function(err, res) {
      if (res && res.length > 0) {
        isSpam = true
      }

      let alreadyProcessed = []

      for (var i=0; i<wordList.length; i++) {
        let hash = generateWordHash(wordList[i])
        if (exports.spamIndex[hash] && alreadyProcessed.indexOf(hash) == -1) {
          if (isSpam) {
            exports.spamIndex[hash].spam ++;
            database.query("UPDATE spam_words SET spam_instances = spam_instances + 1 WHERE word=?", [hash])
          } else {
            exports.spamIndex[hash].ham ++;
            database.query("UPDATE spam_words SET ham_instances = ham_instances + 1 WHERE word=?", [hash])
          }

          database.query("INSERT INTO email_spam_index(email_id, word_id) VALUES(?, ?)", [id, exports.spamIndex[hash].id])
          alreadyProcessed.push(hash)
          exports.spamIndex[hash].score = (exports.spamIndex[hash].spam / (exports.spamIndex[hash].spam + exports.spamIndex[hash].ham))
        }
      }

      database.query("UPDATE emails SET spam_status=? WHERE id=?", [isSpam, id]);
    })
  })
}

exports.mark = function(userid, email, cb) {
  database.query("SELECT * FROM emails WHERE userid=? AND id=? AND spam_status=0", [userid, email], function(err, res) {
    if (res.length > 0) {
      database.query("UPDATE emails SET spam_status=1 WHERE id=?", [email], function() {
        database.query("SELECT word_id, word FROM email_spam_index , spam_words WHERE email_id=? AND spam_words.id=email_spam_index.word_id", [email], function(err, ids) {
          for (var i=0; i<ids.length; i++) {
            database.query("UPDATE spam_words SET ham_instances=ham_instances-1 , spam_instances=spam_instances+1 WHERE id=?", [ids[i].id])
            exports.spamIndex[ids[i].word].ham--
            exports.spamIndex[ids[i].word].spam++

            exports.spamIndex[ids[i].word].score = (exports.spamIndex[ids[i].word].spam / (exports.spamIndex[ids[i].word].spam + exports.spamIndex[ids[i].word].ham))
          }

          database.query("INSERT INTO spam_blacklist(userid, email) VALUES(?, (SELECT email FROM emails WHERE id=?))", [userid, email])
          cb()
        })
      })
    } else {
      cb(new Error("No email found"))
    }
  });
}
