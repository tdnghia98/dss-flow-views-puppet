import { execute } from "./puppet";
console.log("Starting...");
execute('dku15', 'http://dku15.dku.sh:40050', 'SOL_AML_TRIAGE', 6);
