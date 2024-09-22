// Original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Messages to suppress
const suppressMessages = [
    'REGISTRY: Unknown signed extensions CheckFuelTank found, treating them as no-effect',
    'API/INIT: RPC methods not decorated: multitokens_queryClaimableCollections, multitokens_queryClaimableTokens',
    'API/INIT: matrix-enjin/605: Not decorating unknown runtime apis'
];

// Override the console.log method
console.log = (...args) => {
    if (!suppressMessages.some(msg => args[0].includes(msg))) {
        originalConsoleLog.apply(console, args);
    }
};

// Override the console.error method
console.error = (...args) => {
    if (!suppressMessages.some(msg => args[0].includes(msg))) {
        originalConsoleError.apply(console, args);
    }
};

// Override the console.warn method
console.warn = (...args) => {
    if (!suppressMessages.some(msg => args[0].includes(msg))) {
        originalConsoleWarn.apply(console, args);
    }
};

// Now the console methods will ignore the specified messages
