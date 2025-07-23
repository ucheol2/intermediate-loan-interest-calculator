// calculator.js: calculator.py의 기능을 JS로 포팅

function parseKSTDate(str) {
    // 'YYYY-MM-DD' → new Date(year, month-1, day) (로컬 타임존)
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
}

class Transaction {
    constructor(amount, date) {
        this.amount = amount; // 대출 실행: 양수, 상환: 음수
        this.date = parseKSTDate(date);
    }
}

class RatePeriod {
    constructor(start, end, rate) {
        this.start = parseKSTDate(start);
        this.end = parseKSTDate(end);
        this.rate = rate;
    }
}

class LoanInfo {
    constructor(transactions, ratePeriods, maturity) {
        this.transactions = transactions;
        this.ratePeriods = ratePeriods;
        this.maturity = parseKSTDate(maturity);
    }
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function dateToString(date) {
    // YYYY-MM-DD (KST 기준)
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateDailyBalancesAndInterests(transactions, ratePeriods, maturity) {
    // 1. 일별 잔액, 금리, 일 이자 기록
    const txSorted = [...transactions].sort((a, b) => a.date - b.date);
    const rpSorted = [...ratePeriods].sort((a, b) => a.start - b.start);
    const firstDate = new Date(Math.min(...transactions.map(t => t.date)));
    const lastDate = maturity;
    const daily = {};
    let idxTx = 0;
    let principal = 0;
    for (let cur = new Date(firstDate); cur <= lastDate; cur = addDays(cur, 1)) {
        while (idxTx < txSorted.length && dateToString(txSorted[idxTx].date) === dateToString(cur)) {
            principal += txSorted[idxTx].amount;
            idxTx++;
        }
        let rate = null;
        for (const rp of rpSorted) {
            if (rp.start <= cur && cur <= rp.end) {
                rate = rp.rate;
                break;
            }
        }
        if (rate === null) {
            for (let i = rpSorted.length - 1; i >= 0; i--) {
                if (cur > rpSorted[i].end) {
                    rate = rpSorted[i].rate;
                    break;
                }
            }
        }
        const interest = rate !== null ? principal * (rate / 100) / 365 : 0.0;
        daily[dateToString(cur)] = { principal, rate, interest };
    }
    return { daily, firstDate, lastDate };
}
