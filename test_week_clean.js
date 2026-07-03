const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const now = new Date();
const weekId = `${now.getFullYear()}-W${getWeekNumber(now).toString().padStart(2, '0')}`;
const day = now.getDay();
const hour = now.getHours();

console.log(JSON.stringify({
    date: now.toISOString(),
    weekId,
    day,
    hour,
    isMonday: day === 1
}, null, 2));
