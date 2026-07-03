const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getCurrentWeekId = () => {
    const now = new Date(); // Local time
    const year = now.getFullYear();
    const weekNumber = getWeekNumber(now);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

console.log('--- TEST REPORT ---');
console.log('Current Date (Local):', new Date().toString());
console.log('Current Week ID:', getCurrentWeekId());

const sunday = new Date('2026-02-15T12:00:00');
console.log('Sunday Date:', sunday.toString());
console.log('Sunday Week ID:', `${sunday.getFullYear()}-W${getWeekNumber(sunday).toString().padStart(2, '0')}`);
