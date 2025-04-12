const fs = require("fs");

// Import ze froges
const frogs = require("./static/webring/froglist.json");

function makeHtmlRedirect(frog) {
    return `
    <!DOCTYPE HTML>
    <html lang="en-US">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="refresh" content="0; url=${frog.url}">
            <script type="text/javascript">
                // JS redirect as fallback if the meta tag doesn't work
                window.location.href = "${frog.url}"
            </script>
            <title>Page Redirection</title>
        </head>
        <body>
            <!-- And a link, just in case -->
            If you are not redirected automatically, follow this <a href='${frog.url}'>link</a>.
        </body>
    </html>`;
}

function makeRoutes(frog, nextFrog, prevFrog) {
    fs.mkdirSync(`./static/webring/frogs/${frog.name}`, { recursive: true });
    fs.appendFileSync(`./static/webring/frogs/${frog.name}.html`, makeHtmlRedirect(frog));
    fs.appendFileSync(`./static/webring/frogs/${frog.name}/next.html`, makeHtmlRedirect(nextFrog));
    fs.appendFileSync(`./static/webring/frogs/${frog.name}/prev.html`, makeHtmlRedirect(prevFrog));
}

frogs.forEach((frog, i) => {
    const nextFrog = frogs.at((i + 1) % frogs.length);
    const prevFrog = frogs.at(i - 1); // array.at(-1) returns the last element

    makeRoutes(frog, nextFrog, prevFrog);
});