const WSE_FILE = "./.wsaddress";
const fs = require("fs");
// https://stackoverflow.com/questions/12871740/how-to-detach-a-spawned-child-process-in-a-node-js-script
// https://github.com/puppeteer/puppeteer/issues/4061
const LAUNCH_CONFIG = {
    headless: false,
    // handleSIGHUP: false,
    // handleSIGINT: false,
    // handleSIGTERM: false,
    // args: dontBackgroundArgs
    // slowMo: 25,
};

// const dontBackgroundArgs = [
//   '--disable-background-timer-throttling',
//   '--disable-backgrounding-occluded-windows',
//   '--disable-renderer-backgrounding'
// ];

const puppeteer = require("puppeteer");
const { spawnSync, spawn, execSync, exec } = require("child_process");

function importWSEndpointIfItExists() {
    if (fs.existsSync(WSE_FILE)) {
        return fs.readFileSync(WSE_FILE).toString().trim();
    }
}

async function launchNewBrowserAndSaveWSE() {
    let args = puppeteer.defaultArgs();
    args = args.filter((arg) => arg !== "--headless");
    args = args.filter((arg) => arg !== "about:blank");
    const chromiumProgram = puppeteer.executablePath();
    const source = spawn(
        chromiumProgram,
        [...args, "--remote-debugging-port=9444"],
        { detached: true, stdio: ["ignore", "pipe", "pipe"] }
    );

    const stdoutWSEPromise = readIOSourceForWSE(source.stdout); // just for flagging unlogged chrome instances
    const stderrWSEPromise = readIOSourceForWSE(source.stderr);
    const fastFailingStderrWSE = await Promise.race([
        stderrWSEPromise,
        stdoutWSEPromise,
    ]);

    fs.writeFileSync(WSE_FILE, fastFailingStderrWSE);
    console.log("Logged WSE to file");

    return await puppeteer.connect({
        ...LAUNCH_CONFIG,
        browserWSEndpoint: fastFailingStderrWSE,
    });

    // https://2ality.com/2018/05/child-process-streams.html
    // await echoReadable(source.stdout); // (B)

    // Exec way:
    // const executionStatement = chromiumProgram + ' ' + [ ...args, "--remote-debugging-port=9222" ].join(' ')
    // console.log('executionStatement:', executionStatement)
    // execSync(executionStatement)
}

function cutOutWSEUrlFromSTDOUT(haystack) {
    // const example1 = "DevTools listening on ws://127.0.0.1:9222/devtools/browser/36f86b67-2ce8-49de-9ee5-c11936e95e0c"
    const needle = haystack.split(" ")[3];
    return needle;
}

function readIOSourceForWSE(sourceStream) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject("Timeout hit");
        }, 100000000);

        sourceStream.on("data", (chunk) => {
            line = chunk.toString().trim();
            console.log("line: ", line);
            if (line === "") {
                // ignore
                return;
            } else if ("Opening in existing browser session." === line) {
                reject(
                    new Error(
                        `An unregistered version of chromium is running. Please quit it and try this script again.`
                    )
                );
            } else if (line.match(/^DevTools listening on ws/)) {
                resolve(cutOutWSEUrlFromSTDOUT(line));
                // e.g. "DevTools listening on ws://127.0.0.1:9222"
            } else {
                reject(
                    new Error(
                        `unknown response when trying to resolve WS endpoint for browser: "${line}"`
                    )
                );
            }
            // if output
            //   DevTools listening on ws://127.0.0.1:9222
        });
    });
}

async function echoReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) {
        // (C)
        console.log("LINE: " + chomp(line));
    }
}

async function getBrowser() {
    const wse = importWSEndpointIfItExists();
    if (wse === undefined || wse === "") {
        return await launchNewBrowserAndSaveWSE();
    }
    try {
        const connectionOptions = { ...LAUNCH_CONFIG, browserWSEndpoint: wse };
        return await puppeteer.connect(connectionOptions);
    } catch (error) {
        if (
            error.message.includes("connect ECONNREFUSED") ||
            error.message.includes("Invalid URL")
        ) {
            return await launchNewBrowserAndSaveWSE();
        }
        throw error;
    }
}

(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto("https://make.autotiv.com");
})();
async () => {
    // let wsendpoint
    //   while (true) {
    // }
    // process.exit(0)
    // const browser = puppeteer.connect()
    // const page = await browser.newPage()
    // await browser.disconnect()
};

function configureProcessToNotDetachChrome(browser) {
    // process.removeListener('exit',process.rawListeners('exit')[process.rawListeners('exit').length-1]);
    process.on("SIGINT", async () => {
        console.log("disconnecting browser");
        await browser.disconnect();
    });
    console.log("Raw listeners:", process.rawListeners("exit"));
}

// For a fancier invocation, build from here:
// https://gist.github.com/benjamingr/0237932cee84712951a2
process.on("unhandledRejection", (reason) => {
    console.log("\x1b[38;5;1m UPR: ", reason);
});

[
    "SIGHUP",
    "SIGINT",
    "SIGQUIT",
    "SIGILL",
    "SIGTRAP",
    "SIGABRT",
    "SIGEMT",
    "SIGFPE",
    "SIGBUS",
    "SIGSEGV",
    "SIGSYS",
    "SIGPIPE",
    "SIGALRM",
    "SIGTERM",
    "SIGURG",
    "SIGTSTP",
    "SIGCONT",
    "SIGCHLD",
    "SIGTTIN",
    "SIGTTOU",
    "SIGIO",
    "SIGXCPU",
    "SIGXFSZ",
    "SIGVTALRM",
    "SIGPROF",
    "SIGINFO",
    "SIGUSR1",
    "SIGUSR2",
].map((signal) => {
    if ("SIGINT" === signal) return; // dont define process.on(SIGINT)
    process.on(signal, () => {
        console.log(signal + " fired");
    });
});

// process.on('SIGCHLD', () => {
// });

console.log(process.pid);
