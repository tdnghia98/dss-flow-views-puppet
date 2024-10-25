import { execute, stop } from "./puppet";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
console.log("Starting...");
await execute("dku15", "http://dku15.dku.sh:40050", "SOL_AML_TRIAGE", 6);