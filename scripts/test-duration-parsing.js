const durations = [
    "4 Nights / 5 Days",
    "5 Days",
    "5D/4N",
    "3 Nights 4 Days",
    "7 Days Tour"
];

console.log("Current Logic (First Number):");
durations.forEach(d => {
    const val = parseInt((d || '0').match(/\d+/)?.[0] || '0');
    console.log(`"${d}" -> ${val}`);
});

console.log("\nProposed Logic (Max Number):");
durations.forEach(d => {
    const numbers = (d || '0').match(/\d+/g)?.map(n => parseInt(n)) || [0];
    const val = Math.max(...numbers);
    console.log(`"${d}" -> ${val}`);
});

console.log("\nProposed Logic (Regex for Days):");
durations.forEach(d => {
    // Look for number preceding 'd' or 'day'
    const match = d.match(/(\d+)\s*(?:d|day)/i);
    const val = match ? parseInt(match[1]) : 0;
    console.log(`"${d}" -> ${val} (Match: ${match?.[0]})`);
});
