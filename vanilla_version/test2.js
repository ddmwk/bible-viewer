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

function calculateReadCount(startBook, startChapter, endBook, endChapter) {
  let startIndex = bibleData.findIndex(b => b.name === startBook);
  let endIndex = bibleData.findIndex(b => b.name === endBook);

  if (startIndex === -1 || endIndex === -1) return "성경 이름을 확인해주세요.";

  let totalChapters = 0;
  let currentIndex = startIndex;

  // 시작 지점부터 끝 지점까지 순환하며 장수 합산
  while (true) {
    if (currentIndex === endIndex) {
      // 시작과 끝이 같은 권일 때
      if (startIndex === endIndex && startChapter <= endChapter) {
        totalChapters = endChapter - startChapter + 1;
      } else {
        // 한 바퀴 돌아와서 같은 권에 도착한 경우 포함
        totalChapters += (endChapter - 1 + 1); 
      }
      break;
    }

    // 현재 권에서 남은 장수 계산 (시작 권일 때와 아닐 때 구분)
    if (currentIndex === startIndex) {
      totalChapters += (bibleData[currentIndex].chapters - startChapter + 1);
    } else {
      totalChapters += bibleData[currentIndex].chapters;
    }

    // 다음 권으로 이동 (순환)
    currentIndex = (currentIndex + 1) % bibleData.length;
  }

  return totalChapters;
}

// --- 테스트 케이스 ---
// 1. 창세기 1장부터 레위기 17장까지 (이전 예시의 역산)
console.log(`읽어야 할 장 수: ${calculateReadCount("베드로후서", 3, "창세기", 1)}장`); 
// 출력: 100장

// 2. 요한계시록 1장부터 창세기 8장까지 (마지막에서 처음으로 순환)
//console.log(`읽어야 할 장 수: ${calculateReadCount("요한계시록", 1, "창세기", 8)}장`); 
// 출력: 30장
