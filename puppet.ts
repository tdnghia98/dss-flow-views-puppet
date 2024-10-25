import { launch, Locator, Page, Protocol, type Point } from "puppeteer";
import * as fs from "fs";

let isRunning = true;
export function stop() {
    isRunning = false;
}
// 26 views
const viewOrders = {
    zones: 1,
    tags: 2,
    metadata_field: 3,
    sql_pipeline: 4,
    recipe_engine: 5,
};
async function login(page: Page, url: string, project: string) {
    await page.goto(`${url}/projects/${project}/flow/`);
    await page.waitForSelector('input[name="login"]');
    await page.type('input[name="login"]', "admin");

    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', "admin");
    await page.click("button");
    // Await page navigation

    // Wait for the page URL to change after redirect
    await page.waitForFunction(
        `window.location.href !== "${url}/login"`,
        { timeout: 10000 } // Timeout after 10 seconds
    );

    console.log("Redirected to:", page.url());
}

async function pause(duration: number) {
    await new Promise((resolve) => setTimeout(resolve, duration));
}

// Function to capture and log performance metrics
const capturePerformanceMetrics = async (
    instance: string,
    startTime: string,
    page: Page
) => {
    // Use the Chrome DevTools Protocol to capture additional metrics like traces
    const client = await page.createCDPSession();
    await client.send("Performance.enable");

    const performanceMetrics = await client.send("Performance.getMetrics");
    appendMetricsToArray(startTime, instance, performanceMetrics);
};

function appendMetricsToArray(
    prefix: string,
    instance: string,
    metrics: Protocol.Performance.GetMetricsResponse
) {
    const filePath = `assets/${instance}/${prefix}_performanceMetrics.json`;

    let data = [];

    // Check if the file exists and if it's not empty
    if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf-8").trim()) {
        data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
        data = [];
    }

    // Append metrics to the array
    const obj: any = {};
    for (const metric of metrics.metrics) {
        obj[metric.name] = metric.value;
    }
    data.push(obj);

    // Write the updated array back to the file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const timeout = 0;

async function clickViewButton(page: Page) {
    await Locator.race([
        page.locator("views > button"),
        page.locator(":scope >>> views > button"),
    ])
        .setTimeout(timeout)
        .click();
}

async function expandViewPane(page: Page) {
    // Do nothing if view pane is already expanded
    if (await findViewPane(page)) {
        return;
    }
    await clickViewButton(page);
    if (!(await findViewPane(page))) {
        await expandViewPane(page);
    }
}

async function collapseViewPane(page: Page) {
    // Do nothing if view pane is already collapsed
    if (!(await findViewPane(page))) {
        return;
    }
    await clickViewButton(page);
    if (await findViewPane(page)) {
        await collapseViewPane(page);
    }
}

function findViewPane(page: Page) {
    return page.$(".selection-pane");
}

async function waitForSpinner(page: Page) {
    await page.waitForSelector("#qa_spinner.ng-hide", {
        timeout: 100,
    });
    await pause(300);
}

async function dragFlow(
    page: Page,
    start: Point,
    xOffset: number,
    yOffset: number
) {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();

    await page.mouse.move(start.x + xOffset, start.y + yOffset);
    await page.mouse.up();
    await pause(300);
}

async function activateView(page: Page, index: number) {
    await Locator.race([
        page.locator(
            `views > div > div > div > ul > li:nth-of-type(${index}) > button`
        ),
        page.locator(
            `:scope >>> views > div > div > div > ul > li:nth-of-type(${index}) > button`
        ),
    ])
        .setTimeout(timeout)
        .click();
}

async function toggleView(page: Page, viewIndex: number) {
    await collapseViewPane(page);
    await expandViewPane(page);
    await pause(100);
    await activateView(page, viewIndex);
    await pause(100);
    await waitForSpinner(page);
    await clickViewButton(page);
    await pause(100);
    await waitForSpinner(page);
    await collapseViewPane(page);
}

// Main function to run the loop
export async function execute(
    launchLabel: string,
    url: string,
    project: string,
    maxViewIndex: number
) {
    let isInterrupted = false;
    const startTime = new Date();
    // Launch browser with performance flags and open Chrome
    const browser = await launch({
        headless: false, // Ensure browser is visible
        defaultViewport: null, // Fullscreen or adjust viewport if needed
        args: [
            // "--start-maximized", // Start the browser maximized
            "--enable-features=NetworkService,NetworkServiceInProcess", // Enable Chrome features
            "--enable-precise-memory-info", // Memory information for performance
            "--disable-background-networking", // Disable networking in background tabs
            "--disable-infobars",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu=False",
            "--enable-webgl",
            "--window-size=1600,900",
        ],
    });

    const page = await browser.newPage();
    const prefix = `${launchLabel}-${project}-${startTime.toUTCString()}`;
    try {
        // Start analyzing performance
        let iteration = 0;
        await login(page, url, project);
        while (isRunning && !isInterrupted) {
            try {
                console.log(
                    `📊 [${launchLabel}] Iteration ${iteration} @ ${new Date().toISOString()}`
                );
                await capturePerformanceMetrics(launchLabel, prefix, page);

                await dragFlow(page, { x: 427, y: 211 }, 300, 300);
                // Run the recorded steps from your exported Chrome Recorder script
                const viewIndex = 1 + Math.round(Math.random() * maxViewIndex);
                console.log(`Activating view @ index ${viewIndex}`);
                await toggleView(page, viewIndex);

                await dragFlow(page, { x: 457, y: 241 }, -300, -300);
                // Capture performance metrics again after the interaction
                await capturePerformanceMetrics(launchLabel, prefix, page);
                iteration++;
            } catch (error) {
                console.error("Error during test execution:", error);
                isInterrupted = true;
                await browser.disconnect();
                console.log("Browser is left open, but puppeteer has been disconnected");
            }
        }
    } catch (error) {
        console.error("Error during test execution:", error);
    }
}
