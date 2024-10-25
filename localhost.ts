import { execute } from "./puppet";
console.log("Starting...");
execute('local', 'http://localhost:8082', 'CLUBHOUSE_ANALYSIS', 5);
