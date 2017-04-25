
exports.split = function(data, cb) {
  data = data.split("\r\n\r\n")
  let headerData = data[0].trim()
  headerData = exports.unfold(headerData)
  headerData = exports.uncomment(headerData)

  data.splice(0, 1)

  data = data.join("\r\n\r\n")
  data = exports.removeLineDots(data)

  cb(null, headerData, data)
}

exports.processHeaders = function(data) {
  let headers = {}
  let headerList = data.split("\r\n")

  for (let i=0; i<headerList.length; i++) {
    let splitHeader = headerList[i].split(":")
    if (splitHeader.length > 1) {
      let splitHeaderName = splitHeader[0].trim().toLowerCase()
      splitHeader.splice(0, 1)
      let splitHeaderBody = splitHeader.join(":").trim()
      headers[splitHeaderName] = splitHeaderBody
    }
  }

  return headers
}

exports.processBoundaries = function(data, boundary) {
  let exportedData = []
  data = data.trim().split("\r\n")

  let curData = []
  for (let i=0; i<data.length; i++) {
    if (data[i].trim() == "--" + boundary + "--") {
      exportedData.push(curData.join("\r\n").trim())
      break;
    }

    if (data[i].trim() == "--" + boundary) {
      if (curData.length > 0) {
        exportedData.push(curData.join("\r\n").trim())
        curData = []
      }
    } else {
      curData.push(data[i])
    }
  }

  return exportedData
}

exports.process = function(data, cb) {
  exports.split(data, function(err, headers, body) {
    headers = exports.processHeaders(headers);

    let splitContentType = (headers["content-type"] && headers["content-type"].split(";") || "text/plain")

    if (!headers["content-type"]) {
      headers["content-type"] = "text/plain"
    }

    if (headers["content-transfer-encoding"]) {
      if (headers["content-transfer-encoding"].toLowerCase() == "base64") {
        body = (new Buffer(body.replace(".", "").trim(), "base64")).toString()
      } else if (headers["content-transfer-encoding"].toLowerCase() == "quoted-printable") {
        body = exports.decodeQuotedPrintable(body)
      }
    }


    if (headers["content-type"].toLowerCase().indexOf("utf-8") > -1) {
      body = (new Buffer(body, "ascii")).toString("utf8")
    }

    if (splitContentType[0].trim().split("/")[0] == "multipart") {
      splitContentType.splice(0, 1)
      let boundary = ""

      for (let i=0; i<splitContentType.length; i++) {
        let split = splitContentType[i].split("=")
        if (split[0].trim().toLowerCase() == "boundary") {
          split.splice(0, 1)
          split = split.join("=")
          boundary = split.replace(new RegExp("\"", "g"), "")
          break;
        }
      }

      if (boundary) {
        let parts = exports.processBoundaries(body, boundary)

        let i = 0

        let children = []

        function nextPart() {
          if (parts[i]) {
            exports.process(parts[i], function(err, data) {
              if (data) {
                children.push(data);
              }

              i++
              nextPart()
            });
          } else {
            cb(null, {
              type: headers["content-type"].trim().split(";")[0].trim(),
              children: children
            })
          }
        }

        nextPart()

      }
    } else {
      // we have an actual data block
      cb(null, {type: "single", headers: headers, body: body})
    }
  })
}


const Codes = {
  CR: 13,
  LF: 10,
  TAB: 9,
  SPACE: 32
}

exports.unfold = function(data) {
  let unfoldedData = "";

  let add = true;

  for (let i=0; i<data.length; i++) {
    if (i >= 1 && data.length > i+2 && data.charCodeAt(i) == Codes.CR && data.charCodeAt(i+1) == Codes.LF && (data.charCodeAt(i+2) == Codes.SPACE || data.charCodeAt(i+2) == Codes.TAB)) {
      unfoldedData = unfoldedData.trim()
      add = false;

      continue
    }

    if (!add && data.charCodeAt(i) != Codes.LF) {
      add = true;
    }

    if (add) {
      unfoldedData += data[i]
    }
  }

  return unfoldedData;
}

exports.uncomment = function(data) {
  let uncommented = ""

  let commentDepth = 0

  for (let i=0; i<data.length; i++) {
    if (data[i] == "(") {
      commentDepth++;
      continue;

    } else if (data[i] == ")") {
      commentDepth--;
      continue;
    }

    if (commentDepth < 1) {
      uncommented += data[i]
    }
  }

  return uncommented
}

exports.removeLineDots = function(data) {
  let lines = data.split("\r\n")

  for (let i=0; i<lines.length; i++) {
    if (lines[i][0] + lines[i][1] == "..") {
      lines[i] = lines[i].substr(1)
    }
  }

  return lines.join("\r\n")
}

exports.decodeQuotedPrintable = function(data) {
  data = data.replace(new RegExp("=\r\n", "g"), "")
  data = data.replace(new RegExp("=\n", "g"), "")

  let output = ""
  let i = 0

  while (i<data.length) {
    if (data[i] == "=" && i < data.length-2) {
      let ascii = String.fromCharCode(parseInt(data[i + 1] + data[i + 2], 16))
      output += ascii
      i+= 3
    } else {
      output += data[i]
      i ++
    }
  }

  return output
}

exports.parseSubject = function(data) {
  let output = ""

  let processing = false
  let encoding = false
  let charset = false
  let currentData = ""
  let i = 0

  while (i<data.length) {
    if (data[i] == "=" && data[i+1] && data[i+1] == "?" && !processing) {
      processing = true
      i += 2
    } else if (data[i] == "?") {
      if (processing && !charset) {
        charset = currentData.toLowerCase()
      } else if (processing && !encoding) {
        encoding = currentData.toLowerCase()
      } else if (data[i+1] && data[i+1] == "=" && processing) {
        if (encoding == "q") {
          currentData = exports.decodeQuotedPrintable(currentData)
        } else if (encoding == "b") {
          currentData = (new Buffer(currentData, "base64")).toString()
        }

        if (charset == "utf-8") {
          currentData = (new Buffer(currentData, "ascii")).toString("utf8")
        }

        currentData = currentData.replace(new RegExp("_", "g"), " ")

        output += currentData
        processing = false
        charset = false
        encoding = false

        i ++
      }

      currentData = ""
      i++

    } else {
      if (processing) {
        currentData += data[i]
      } else {
        output += data[i]
      }
      i++
    }
  }

  return output
}
