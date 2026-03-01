// 성경 데이터 (from test.js/test2.js)
const bibleData = [
  { name: "창세기", chapters: 50 }, { name: "출애굽기", chapters: 40 }, { name: "레위기", chapters: 27 },
  { name: "민수기", chapters: 36 }, { name: "신명기", chapters: 34 }, { name: "여호수아", chapters: 24 },
  { name: "사사기", chapters: 21 }, { name: "루기", chapters: 4 }, { name: "사무엘상", chapters: 31 },
  { name: "사무엘하", chapters: 24 }, { name: "열왕기상", chapters: 22 }, { name: "열왕기하", chapters: 25 },
  { name: "역대상", chapters: 29 }, { name: "역대하", chapters: 36 }, { name: "에스라", chapters: 10 },
  { name: "느헤미야", chapters: 13 }, { name: "에스더", chapters: 10 }, { name: "욥기", chapters: 42 },
  { name: "시편", chapters: 150 }, { name: "잠언", chapters: 31 }, { name: "전도서", chapters: 12 },
  { name: "아가", chapters: 8 }, { name: "이사야", chapters: 66 }, { name: "예레미야", chapters: 52 },
  { name: "예레미야 애가", chapters: 5 }, { name: "에스겔", chapters: 48 }, { name: "다니엘", chapters: 12 },
  { name: "호세아", chapters: 14 }, { name: "요엘", chapters: 3 }, { name: "아모스", chapters: 9 },
  { name: "오바댜", chapters: 1 }, { name: "요나", chapters: 4 }, { name: "미가", chapters: 7 },
  { name: "나훔", chapters: 3 }, { name: "하박국", chapters: 3 }, { name: "스바냐", chapters: 3 },
  { name: "학개", chapters: 2 }, { name: "스가랴", chapters: 14 }, { name: "말라기", chapters: 4 },
  { name: "마태복음", chapters: 28 }, { name: "마가복음", chapters: 16 }, { name: "누가복음", chapters: 24 },
  { name: "요한복음", chapters: 21 }, { name: "사도행전", chapters: 28 }, { name: "로마서", chapters: 16 },
  { name: "고린도전서", chapters: 16 }, { name: "고린도후서", chapters: 13 }, { name: "갈라디아서", chapters: 6 },
  { name: "에베소서", chapters: 6 }, { name: "빌립보서", chapters: 4 }, { name: "골로새서", chapters: 4 },
  { name: "데살로니가전서", chapters: 5 }, { name: "데살로니가후서", chapters: 3 }, { name: "디모데전서", chapters: 6 },
  { name: "디모데후서", chapters: 4 }, { name: "디도서", chapters: 3 }, { name: "빌레몬서", chapters: 1 },
  { name: "히브리서", chapters: 13 }, { name: "야고보서", chapters: 5 }, { name: "베드로전서", chapters: 5 },
  { name: "베드로후서", chapters: 3 }, { name: "요한일서", chapters: 5 }, { name: "요한이서", chapters: 1 },
  { name: "요한삼서", chapters: 1 }, { name: "유다서", chapters: 1 }, { name: "요한계시록", chapters: 22 }
];

// --- Initialization ---
function init() {
    const selects = [
        document.getElementById('target-start-book'),
        document.getElementById('count-start-book'),
        document.getElementById('count-end-book')
    ];

    selects.forEach(select => {
        bibleData.forEach(book => {
            const option = document.createElement('option');
            option.value = book.name;
            option.textContent = book.name;
            select.appendChild(option);
        });
    });

    // Default 'End Book' selection to Revelation for variety
    document.getElementById('count-end-book').value = "요한계시록";
}

// --- Tab Logic ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.calculator-section').forEach(sec => sec.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`section-${tabName}`).classList.add('active');
}

// --- Feature 1: Target Calculator (test.js logic) ---
function calculateBibleTargetLogic(startBookName, startChapter, readCount) {
    let bookIndex = bibleData.findIndex(b => b.name === startBookName); // -1 check handled by select
    let currentChapter = parseInt(startChapter);
    let remainingChapters = parseInt(readCount) - 1; 

    // Validation
    const startBookData = bibleData[bookIndex];
    if (currentChapter > startBookData.chapters || currentChapter < 1) {
        return { error: `${startBookName}은(는) 1장부터 ${startBookData.chapters}장까지만 있습니다.` };
    }

    while (remainingChapters > 0) {
        let chaptersInCurrentBook = bibleData[bookIndex].chapters;
        let availableInCurrentBook = chaptersInCurrentBook - currentChapter;

        if (remainingChapters <= availableInCurrentBook) {
            currentChapter += remainingChapters;
            remainingChapters = 0;
        } else {
            remainingChapters -= (availableInCurrentBook + 1);
            bookIndex = (bookIndex + 1) % bibleData.length; 
            currentChapter = 1;
        }
    }
    return { result: `${bibleData[bookIndex].name} ${currentChapter}장` };
}

function calculateTarget() {
    const book = document.getElementById('target-start-book').value;
    const chapter = document.getElementById('target-start-chapter').value;
    const count = document.getElementById('target-read-count').value;

    const resultBox = document.getElementById('result-target');
    
    const output = calculateBibleTargetLogic(book, chapter, count);

    resultBox.classList.remove('hidden');
    if (output.error) {
        resultBox.textContent = `❌ ${output.error}`;
        resultBox.style.color = "red";
    } else {
        resultBox.innerHTML = `오늘 읽으면 <br><strong>${output.result}</strong> 까지 읽게 됩니다!`;
        resultBox.style.color = "#1565c0";
    }
}

// --- Feature 2: Count Calculator (test2.js logic) ---
function calculateReadCountLogic(startBook, startChapter, endBook, endChapter) {
   let startIndex = bibleData.findIndex(b => b.name === startBook);
   let endIndex = bibleData.findIndex(b => b.name === endBook);
   
   let sChap = parseInt(startChapter);
   let eChap = parseInt(endChapter);

   // Validation
   if (sChap > bibleData[startIndex].chapters || sChap < 1) return { error: `${startBook} 범위 오류` };
   if (eChap > bibleData[endIndex].chapters || eChap < 1) return { error: `${endBook} 범위 오류` };

   let totalChapters = 0;
   let currentIndex = startIndex;

   // Safety break for infinite loop (though logic shouldn't allow it)
   let loopCount = 0; 
   while (loopCount < 200) { 
     loopCount++;
     
     if (currentIndex === endIndex) {
       if (startIndex === endIndex && sChap <= eChap) {
         totalChapters = eChap - sChap + 1;
       } else {
         // Loop around case
         totalChapters += (eChap - 1 + 1); 
       }
       break;
     }

     if (currentIndex === startIndex) {
       totalChapters += (bibleData[currentIndex].chapters - sChap + 1);
     } else {
       totalChapters += bibleData[currentIndex].chapters;
     }

     currentIndex = (currentIndex + 1) % bibleData.length;
   }

   return { result: totalChapters };
}

function calculateCount() {
    const startBook = document.getElementById('count-start-book').value;
    const startChapter = document.getElementById('count-start-chapter').value;
    const endBook = document.getElementById('count-end-book').value;
    const endChapter = document.getElementById('count-end-chapter').value;

    const resultBox = document.getElementById('result-count');
    const output = calculateReadCountLogic(startBook, startChapter, endBook, endChapter);

    resultBox.classList.remove('hidden');
    if (output.error) {
        resultBox.textContent = `❌ ${output.error}`;
        resultBox.style.color = "red";
    } else {
        resultBox.innerHTML = `총 읽어야 할 분량은 <br><strong>${output.result}장</strong> 입니다.`;
        resultBox.style.color = "#1565c0";
    }
}

// Run init
init();
