sm.mime = {}

var testData = 'Content-Type: multipart/mixed; Boundary="mixedboundary"\r\n\r\n--mixedboundary\r\nContent-Type:multipart/alternative; boundary=alternativebound\r\n\r\n--alternativebound\r\nContent-Type:text/plain\r\n\r\nHello world\r\n\r\n--alternativebound\r\nContent-Type:text/html\r\n\r\n<html>Hello World</html>\r\n\r\n--alternativebound--\r\n\r\n--mixedboundary\r\nContent-Type: attachment/fucker\r\n\r\nFUCKING ATTACHMENT m8\r\n\r\n--mixedboundary--\r\n'

sm.mime.split = function(data, cb) {
  data = data.split("\r\n\r\n")
  var headerData = data[0].trim()
  headerData = sm.mime.unfold(headerData)
  headerData = sm.mime.uncomment(headerData)

  data.splice(0, 1)

  data = data.join("\r\n\r\n")

  cb(null, headerData, data)
}

sm.mime.processHeaders = function(data) {
  var headers = {}
  var headerList = data.split("\r\n")

  for (var i=0; i<headerList.length; i++) {
    var splitHeader = headerList[i].split(":")
    if (splitHeader.length > 1) {
      var splitHeaderName = splitHeader[0].trim().toLowerCase()
      splitHeader.splice(0, 1)
      var splitHeaderBody = splitHeader.join(":").trim()
      headers[splitHeaderName] = splitHeaderBody
    }
  }

  return headers
}

sm.mime.processBoundaries = function(data, boundary) {
  var exportedData = []
  data = data.trim().split("\r\n")

  var curData = []
  for (var i=0; i<data.length; i++) {
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

sm.mime.process = function(data, cb) {
  sm.mime.split(data, function(err, headers, body) {
    headers = sm.mime.processHeaders(headers);

    var splitContentType = (headers["content-type"] && headers["content-type"].split(";") || "text/plain")

    if (headers["content-transfer-encoding"]) {
      if (headers["content-transfer-encoding"].toLowerCase() == "base64") {
        body = atob(body.replace(".", "").trim())
      } else if (headers["content-transfer-encoding"].toLowerCase() == "quoted-printable") {
        body = sm.mime.decodeQuotedPrintable(body)
      }
    }

    if (headers["content-type"].toLowerCase().indexOf("utf-8") > -1) {
      body = (new buffer.Buffer(body, "ascii")).toString("utf8")
    }

    if (splitContentType[0].trim().split("/")[0] == "multipart") {
      splitContentType.splice(0, 1)
      var boundary = ""

      for (var i=0; i<splitContentType.length; i++) {
        var split = splitContentType[i].split("=")
        if (split[0].trim().toLowerCase() == "boundary") {
          split.splice(0, 1)
          split = split.join("=")
          boundary = split.replace(new RegExp("\"", "g"), "")
          break;
        }
      }

      if (boundary) {
        var parts = sm.mime.processBoundaries(body, boundary)

        var i = 0

        var children = []

        function nextPart() {
          if (parts[i]) {
            sm.mime.process(parts[i], function(err, data) {
              children.push(data);
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


var Codes = {
  CR: 13,
  LF: 10,
  TAB: 9,
  SPACE: 32
}

sm.mime.unfold = function(data) {
  var unfoldedData = "";

  var add = true;

  for (var i=0; i<data.length; i++) {
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

sm.mime.uncomment = function(data) {
  var uncommented = ""

  var commentDepth = 0

  for (var i=0; i<data.length; i++) {
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

sm.mime.decodeQuotedPrintable = function(data) {
  data = data.replace(new RegExp("=\r\n", "g"), "")
  data = data.replace(new RegExp("=\n", "g"), "")

  var output = ""
  var i = 0

  while (i<data.length) {
    if (data[i] == "=" && i < data.length-2) {
      var ascii = String.fromCharCode(parseInt(data[i + 1] + data[i + 2], 16))
      output += ascii
      i+= 3
    } else {
      output += data[i]
      i ++
    }
  }

  return output
}

sm.mime.parseSubject = function(data) {
  var output = ""

  var processing = false
  var encoding = false
  var charset = false
  var currentData = ""
  var i = 0

  while (i<data.length) {
    if (data[i] == "=" && data[i+1] && data[i+1] == "?" && !processing) {
      processing = true
      i += 2
    } else if (data[i] == "?") {
      if (processing && !charset) {
        charset = currentData.toLowerCase()
      } else if (processing && !encoding) {
        encoding = currentData.toLowerCase()
      } else if (processing) {
        if (encoding == "q") {
          currentData = sm.mime.decodeQuotedPrintable(currentData)
        } else if (encoding == "b") {
          currentData = atob(currentData)
        }

        currentData = (new buffer.Buffer(currentData, "ascii")).toString(charset.replace("-", ""))
        currentData = currentData.replace(new RegExp("_", "g"), " ")

        output += currentData
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
