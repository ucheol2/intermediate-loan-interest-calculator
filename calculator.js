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

function printEventPeriods(daily, transactions, ratePeriods, maturity) {
    // transaction 발생일 기준 구간별 이자 집계
    console.log("[Event Period Interest]");
    // 모든 이벤트 날짜 수집 (트랜잭션, 금리변경, 만기)
    const eventDates = new Set(transactions.map(t => dateToString(t.date)));
    ratePeriods.forEach(rp => eventDates.add(dateToString(rp.start)));
    eventDates.add(dateToString(maturity));
    const eventDatesSorted = Array.from(eventDates).sort();
    // 이벤트 맵핑
    const txMap = {};
    transactions.forEach(t => { txMap[dateToString(t.date)] = t.amount; });
    const rateMap = {};
    ratePeriods.forEach(rp => { rateMap[dateToString(rp.start)] = rp.rate; });
    // 헤더
    console.log(`${'Period'.padEnd(23)}${'Principal'.padStart(18)}${'Rate(%)'.padStart(8)}${'Days'.padStart(6)}${'Interest'.padStart(18)}  Event`);
    for (let i = 0; i < eventDatesSorted.length - 1; i++) {
        const start = eventDatesSorted[i];
        const endDate = new Date(eventDatesSorted[i + 1]);
        endDate.setDate(endDate.getDate() - 1);
        const end = dateToString(endDate);
        if (start > end) continue;
        let totalInterest = 0;
        let days = 0;
        for (const d in daily) {
            if (d >= start && d <= end) {
                totalInterest += daily[d].interest;
                days++;
            }
        }
        const principal = daily[start] ? daily[start].principal : 0;
        const rate = daily[start] ? daily[start].rate : 0;
        const eventStrs = [];
        if (txMap[start] !== undefined) {
            const amt = txMap[start];
            if (amt > 0) eventStrs.push(`Loan(+${amt.toLocaleString()})`);
            else eventStrs.push(`Prepay(${amt.toLocaleString()})`);
        }
        if (rateMap[start] !== undefined) {
            eventStrs.push(`Rate(${rateMap[start]}%)`);
        }
        if (start === dateToString(maturity)) {
            eventStrs.push("Maturity");
        }
        if (eventStrs.length === 0) eventStrs.push("-");
        const periodStr = `${start} ~ ${end}`;
        console.log(`${periodStr.padEnd(23)}${principal.toLocaleString().padStart(18)}${rate.toFixed(2).padStart(8)}${days.toString().padStart(6)}${Math.round(totalInterest).toLocaleString().padStart(18)}  ${eventStrs.join(' ')}`);
    }
}

function printMonthlyPeriods(daily, lastDate, firstDate) {
    // 월별 이자 합계: 첫 실행일부터 첫 11일 구간, 이후 매월 11일~다음달 10일
    console.log("\n[Monthly Interest]");
    // 첫 구간: firstDate ~ 2024-01-10
    const firstMonthEnd = parseKSTDate("2024-01-10");
    let periodStart = firstDate;
    let periodEnd = firstMonthEnd < lastDate ? firstMonthEnd : lastDate;
    let totalInterest = 0;
    const periodStartStr = dateToString(periodStart);
    const periodEndStr = dateToString(periodEnd);
    for (const d in daily) {
        if (d >= periodStartStr && d <= periodEndStr) {
            totalInterest += daily[d].interest;
        }
    }
    console.log(`${periodStartStr} ~ ${periodEndStr} | Interest: ${Math.round(totalInterest).toLocaleString()}`);
    // 이후 구간: 2024-01-11부터 매월 11일~다음달 10일
    let monthStart = parseKSTDate("2024-01-11");
    while (monthStart <= lastDate) {
        let year = monthStart.getFullYear();
        let month = monthStart.getMonth() + 1; // 1~12
        // 다음달 10일 구하기
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        let periodEnd = new Date(nextYear, nextMonth - 1, 10);
        if (periodEnd > lastDate) periodEnd = lastDate;
        let totalInterest = 0;
        const monthStartStr = dateToString(monthStart);
        const periodEndStr = dateToString(periodEnd);
        for (const d in daily) {
            if (d >= monthStartStr && d <= periodEndStr) {
                totalInterest += daily[d].interest;
            }
        }
        console.log(`${monthStartStr} ~ ${periodEndStr} | Interest: ${Math.round(totalInterest).toLocaleString()}`);
        // 다음 구간의 시작일은 이번 구간의 끝 다음날(11일)
        monthStart = new Date(periodEnd);
        monthStart.setDate(monthStart.getDate() + 1);
    }
}

function printResultV2(transactions, ratePeriods, maturity) {
    const { daily, firstDate, lastDate } = calculateDailyBalancesAndInterests(transactions, ratePeriods, maturity);
    const totalInterest = Object.values(daily).reduce((acc, d) => acc + d.interest, 0);
    console.log(`총 이자: ${Math.round(totalInterest).toLocaleString()}원\n`);
    printEventPeriods(daily, transactions, ratePeriods, maturity);
    printMonthlyPeriods(daily, lastDate, firstDate);
}
