exports.processAddress = function(str, cb) {
  let address = "";
  let name = "";
  let started = false

  if (str.indexOf("<") == -1  && str.indexOf("@") > -1) {
    address = str
  } else {

    for (var i=0; i<str.length; i++) {
      if (str[i] == "<") {
        started = true
        continue
      } else if (str[i] == ">") {
        break
      }

      if (started) {
        address += str[i]
      } else {
        name += str[i]
      }
    }

    name = name.trim()
    address = address.trim().toLowerCase()

  }

  return {
    name: name,
    address: address
  }
}

exports.processAddressString = function(str, cb) {
  let addresses = []

  function processAddresses(data) {
    let addressData = data.split(",")
    let addresses = []

    for (var i=0; i<addressData.length; i++) {
      let address = exports.processAddress(addressData[i])
      address.type = "single"

      addresses.push(address)
    }

    return addresses
  }

  if (str.indexOf(";") > -1) {
    let addressGroups = str.split(";")
    for (var i=0; i<addressGroups.length; i++) {
      let splitGroup = addressGroups[i].split(":")
      let groupName = splitGroup[0].trim()
      let addressMembers = splitGroup[1].trim()

      addresses.push({
        type: "group",
        name: groupName,
        members: processAddresses(addressMembers)
      });
    }

  } else {
    addresses = processAddresses(str)
  }

  return addresses
}

exports.validEmail = function(email) {
  email = email.split("@")
  return (email.length == 2 && email[0].length > 0 && email[1].length > 0)
}
