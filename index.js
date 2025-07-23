// index.js: 폼 입력 → calculator.js 함수 호출 → 결과 DOM 출력

document.addEventListener('DOMContentLoaded', () => {
    const loanForm = document.getElementById('loan-form');
    const totalInterestDiv = document.getElementById('total-interest');
    const monthlyInterestDiv = document.getElementById('monthly-interest');
    const eventPeriodsDiv = document.getElementById('event-periods');
    const loansList = document.getElementById('loans-list');
    const addLoanBtn = document.getElementById('add-loan');
    const repaysList = document.getElementById('repays-list');
    const addRepayBtn = document.getElementById('add-repay');

    // 금액을 억/만 단위 한글로 변환
    function formatKoreanMoney(num) {
        if (isNaN(num) || num === 0) return '';
        let absNum = Math.abs(num);
        let result = '';
        if (absNum >= 100000000) {
            result += Math.floor(absNum / 100000000) + '억';
            absNum = absNum % 100000000;
        }
        if (absNum >= 10000) {
            result += (result ? ' ' : '') + Math.floor(absNum / 10000) + '만';
            absNum = absNum % 10000;
        }
        if (absNum > 0 && result === '') {
            result = absNum + '원';
        } else if (result !== '') {
            result += '원';
        }
        return (num < 0 ? '-' : '') + result;
    }
    // 대출 실행 행 추가 함수
    function addLoanRow(amount = '', date = '') {
        const n = loansList.querySelectorAll('.loan-row').length + 1;
        const row = document.createElement('div');
        row.className = 'loan-row';
        row.innerHTML = `
            <span class="loan-label">${n}차</span>
            <input type="number" class="loan-amount" placeholder="금액(원)" value="${amount}" required>
            <span class="loan-korean"></span>
            <input type="date" class="loan-date" value="${date}" required>
            <button type="button" class="remove-loan">삭제</button>
        `;
        const amountInput = row.querySelector('.loan-amount');
        const koreanSpan = row.querySelector('.loan-korean');
        function updateKorean() {
            const val = parseInt(amountInput.value, 10);
            koreanSpan.textContent = amountInput.value ? formatKoreanMoney(val) : '';
        }
        amountInput.addEventListener('input', updateKorean);
        updateKorean();
        row.querySelector('.remove-loan').onclick = () => {
            row.remove();
            updateLoanLabels();
        };
        loansList.appendChild(row);
    }
    // 대출 실행 행 삭제 후 라벨 재정렬 함수
    function updateLoanLabels() {
        const rows = loansList.querySelectorAll('.loan-row');
        rows.forEach((row, idx) => {
            const label = row.querySelector('.loan-label');
            if (label) label.textContent = `${idx + 1}차`;
        });
    }
    // 중도 상환 행 추가 함수 (한글 금액 표시 추가)
    function addRepayRow(amount = '', date = '') {
        const row = document.createElement('div');
        row.className = 'repay-row';
        row.innerHTML = `
            <input type="number" class="repay-amount" placeholder="금액(원)" value="${amount}" required>
            <span class="repay-korean"></span>
            <input type="date" class="repay-date" value="${date}" required>
            <button type="button" class="remove-repay">삭제</button>
        `;
        const amountInput = row.querySelector('.repay-amount');
        amountInput.min = 0;
        const koreanSpan = row.querySelector('.repay-korean');
        function updateKorean() {
            const val = parseInt(amountInput.value, 10);
            koreanSpan.textContent = amountInput.value ? formatKoreanMoney(val) : '';
        }
        amountInput.addEventListener('input', updateKorean);
        updateKorean();
        row.querySelector('.remove-repay').onclick = () => row.remove();
        repaysList.appendChild(row);
    }

    // 초기 대출 실행일 기본값 배열
    const defaultLoanDates = [
        "2023-12-11",
        "2024-03-11",
        "2024-06-10",
        "2024-10-10",
        "2025-01-10",
        "2025-04-10"
    ];
    // 초기 대출 실행 행들 추가
    if (loansList.children.length === 0) {
        for (const date of defaultLoanDates) {
            addLoanRow('', date);
        }
    }
    addLoanBtn.onclick = () => { addLoanRow(); updateLoanLabels(); };
    addRepayBtn.onclick = () => { addRepayRow(); };

    // localStorage 키
    const STORAGE_KEY = 'loanCalculatorForm';

    // 폼 입력값 저장
    function saveFormToStorage() {
        // 대출 실행
        const loanRows = loansList.querySelectorAll('.loan-row');
        const loans = Array.from(loanRows).map(row => ({
            amount: row.querySelector('.loan-amount').value,
            date: row.querySelector('.loan-date').value
        }));
        // 중도 상환
        const repayRows = repaysList.querySelectorAll('.repay-row');
        const repays = Array.from(repayRows).map(row => ({
            amount: row.querySelector('.repay-amount').value,
            date: row.querySelector('.repay-date').value
        }));
        // 만기일
        const maturity = document.getElementById('maturity').value;
        const data = { loans, repays, maturity };
        console.log(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // 폼 입력값 불러오기
    function loadFormFromStorage() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return false;
        try {
            const { loans, repays, maturity } = JSON.parse(data);
            // 대출 실행
            loansList.innerHTML = '';
            loans.forEach((item, idx) => {
                addLoanRow(item.amount, item.date);
            });
            updateLoanLabels();
            // 중도 상환
            repaysList.innerHTML = '';
            repays.forEach(item => {
                addRepayRow(item.amount, item.date);
            });
            // 만기일
            document.getElementById('maturity').value = maturity || '';
            return true;
        } catch (e) {
            return false;
        }
    }

    // 페이지 로드 시: 저장값 있으면 불러오고, 없으면 기본값
    if (!loadFormFromStorage()) {
        // 기본값: 대출 실행 날짜
        if (loansList.children.length === 0) {
            for (const date of defaultLoanDates) {
                addLoanRow('', date);
            }
        }
    }

    loanForm.onsubmit = (e) => {
        e.preventDefault();
        // 대출 실행 입력값 수집
        const loanRows = loansList.querySelectorAll('.loan-row');
        const transactions = [];
        for (const row of loanRows) {
            const amount = parseFloat(row.querySelector('.loan-amount').value);
            const date = row.querySelector('.loan-date').value;
            if (!isNaN(amount) && date) {
                transactions.push(new Transaction(amount, date));
            }
        }
        // 중도 상환 입력값 수집 (계산 시 음수로 변환)
        const repayRows = repaysList.querySelectorAll('.repay-row');
        for (const row of repayRows) {
            const amount = parseFloat(row.querySelector('.repay-amount').value);
            const date = row.querySelector('.repay-date').value;
            if (!isNaN(amount) && date) {
                transactions.push(new Transaction(-Math.abs(amount), date));
            }
        }
        const maturity = document.getElementById('maturity').value;
        if (!maturity || transactions.length === 0) {
            alert('모든 값을 입력해주세요.');
            return;
        }
        // 금리 구간은 calculator.js의 예시를 그대로 사용
        const ratePeriods = [
            new RatePeriod("2023-12-11", "2024-06-10", 4.48),
            new RatePeriod("2024-06-11", "2024-12-10", 4.05),
            new RatePeriod("2024-12-11", "2025-06-10", 3.88),
            new RatePeriod("2025-06-11", "2025-08-05", 3.21),
        ];
        // 계산
        const { daily, firstDate, lastDate } = calculateDailyBalancesAndInterests(transactions, ratePeriods, parseKSTDate(maturity));
        const totalInterest = Object.values(daily).reduce((acc, d) => acc + d.interest, 0);
        // 결과 출력
        totalInterestDiv.textContent = `총 이자: ${Math.round(totalInterest).toLocaleString()}원`;
        // 월별 이자 내역
        monthlyInterestDiv.innerHTML = renderMonthlyInterest(daily, lastDate, firstDate);
        // 저장
        saveFormToStorage();
    };

    // 월별 이자 내역 HTML 생성
    function renderMonthlyInterest(daily, lastDate, firstDate) {
        let html = '<ul>';
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
        html += `<li>${periodStartStr} ~ ${periodEndStr} | 이자: ${Math.round(totalInterest).toLocaleString()}원`;
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
            html += `<li>${monthStartStr} ~ ${periodEndStr} | 이자: ${Math.round(totalInterest).toLocaleString()}원`;
            // 다음 구간의 시작일은 이번 구간의 끝 다음날(11일)
            monthStart = new Date(periodEnd);
            monthStart.setDate(monthStart.getDate() + 1);
        }
        html += '</ul>';
        return html;
    }
}); 