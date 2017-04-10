const fs = require("fs");

let files = fs.readdirSync("routes");

for (i=0; i<files.length; i++) {
    exports[files[i].split(".")[0]] = require("./" + files[i]);
}
