import { execute, stop } from "./puppet";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
console.log("Starting...");
process.on("SIGINT", () => {
    console.log("Received SIGINT. Press Control-D to exit.");
}); // CTRL+C
const rl = readline.createInterface({ input, output });
rl.on("close", () => {
    stop();
});
process.on("SIGQUIT", () => {}); // Keyboard quit
process.on("SIGTERM", () => {}); // `kill` command

async function main() {
    await execute("dku15", "http://dku15.dku.sh:40050", "SOL_AML_TRIAGE", 6);
}

main().catch((err) => {
    console.error("An error occurred:", err);
    rl.close();
});
