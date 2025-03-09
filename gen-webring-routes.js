const fs = require("fs");

function makeRoute() {
    fs.appendFileSync('./static/test.html', 'Hello world!');
}

makeRoute();