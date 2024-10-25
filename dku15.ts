import { execute } from "./puppet";
console.log("Starting...");
const browser = execute('dku15', 'http://dku15.dku.sh:40050', 'CLUBHOUSE_ANALYSIS', 5);
