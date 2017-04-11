const fs = require("fs")

let data = fs.readFileSync("data.txt").toString()
console.log(data)

data = data.replace(new RegExp("\n", "g"), "\\r\\n")

console.log(data)
