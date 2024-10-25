import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { clearLine, cursorTo } from "node:readline";
import { stop } from "../puppet";

export class ConsoleManager {
    private rl: readline.Interface;
    private currentPrompt: string;
    constructor() {
        // Create readline interface
        this.rl = readline.createInterface({
            input: input,
            output: output,
        });

        // Keep track of the current input prompt
        this.currentPrompt = "";

        // Handle line input
        this.rl.on("line", (input) => {
            // Clear the current prompt
            clearLine(process.stdout, 0);
            cursorTo(process.stdout, 0);

            // Process the input
            this.handleInput(input);

            // Rewrite the prompt
            this.showPrompt();
        });
    }

    // Method to log without interfering with input
    log(...args: string[]) {
        // Clear the current line
        clearLine(process.stdout, 0);
        cursorTo(process.stdout, 0);

        // Log the message
        console.log(args);

        // Rewrite the prompt and current input
        this.showPrompt();
    }

    // Show the input prompt
    showPrompt() {
        this.rl.write(null, { ctrl: true, name: "u" }); // Clear current input
        this.rl.prompt(true); // Reshow the prompt
    }

    // Handle user input
    handleInput(input: string) {
        // Example input handling
        if (input.toLowerCase() === "quit") {
            this.log("Shutting down...");
            this.rl.close();
            process.exit(0);
        } else if (input.toLowerCase() === "stop") {
            stop();
        } else {
            this.log(`You entered: ${input}`);
        }
    }
}

// Usage example
const manager = new ConsoleManager();

// // Simulate periodic logging while accepting input
// let counter = 0;
// const interval = setInterval(() => {
//     manager.log(`System message #${counter++}`);

//     // Optional: stop after some time
//     if (counter > 100) {
//         clearInterval(interval);
//     }
// }, 2000);

// Example of handling Ctrl + key combinations while still accepting regular input
process.stdin.setRawMode(true);
process.stdin.on("data", (key) => {
    // Check for Ctrl + key combinations
    if (key.length === 1 && key[0] < 32) {
        const ctrlKey = String.fromCharCode(key[0] + 64);
        manager.log(`Detected Ctrl+${ctrlKey}`);

        // Handle Ctrl+C
        if (key[0] === 3) {
            manager.log("Exiting...");
            process.exit(0);
        }
    }
});

// Initial prompt
manager.log('Start typing. Type "quit" to exit. Press Ctrl+C to force exit.');
