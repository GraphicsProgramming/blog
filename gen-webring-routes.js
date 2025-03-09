const fs = require("fs");

// Import ze froges
const frogs = require("./static/webring/froglist.json");

function makeRoutes(frog, nextFrog, prevFrog) {
    fs.appendFileSync(`./static/webring/frogs/${frog.name}.html`, frog.url);
    fs.appendFileSync(`./static/webring/frogs/${frog.name}/next.html`, nextFrog.url);
    fs.appendFileSync(`./static/webring/frogs/${frog.name}/prev.html`, prevFrog.url);
}

frogs.forEach((frog, i) => {
    const nextFrog = frogs.at((i + 1) % frogs.length);
    const prevFrog = frogs.at(i - 1); // array.at(-1) returns the last element

    makeRoutes(frog, nextFrog, prevFrog);
});