import React, { useState } from 'react';
import { bibleData } from '../data/bibleData';

function CountCalculator() {
  const [startBook, setStartBook] = useState(bibleData[0].name);
  const [startChapter, setStartChapter] = useState(1);
  const [endBook, setEndBook] = useState("요한계시록");
  const [endChapter, setEndChapter] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history
  React.useEffect(() => {
    const saved = localStorage.getItem('count_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('count_history', JSON.stringify(newHistory));
  };

  const calculate = () => {
    let startIndex = bibleData.findIndex(b => b.name === startBook);
    let endIndex = bibleData.findIndex(b => b.name === endBook);
    
    let sChap = parseInt(startChapter);
    let eChap = parseInt(endChapter);

    // Validation
    if (sChap > bibleData[startIndex].chapters || sChap < 1) {
       setError(`${startBook} 범위 오류`);
       setResult(null);
       return;
    }
    if (eChap > bibleData[endIndex].chapters || eChap < 1) {
       setError(`${endBook} 범위 오류`);
       setResult(null);
       return;
    }

    let totalChapters = 0;
    let currentIndex = startIndex;
    let loopCount = 0; 
    
    while (loopCount < 200) { 
      loopCount++;
      
      if (currentIndex === endIndex) {
        if (startIndex === endIndex && sChap <= eChap) {
          totalChapters = eChap - sChap + 1;
        } else {
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

    setResult(totalChapters);
    setError(null);
  };

  const handleSave = () => {
    if (result === null) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `${startBook} ${startChapter}장 ~ ${endBook} ${endChapter}장`,
      result: `${result}장`
    };
    const newHistory = [newItem, ...history];
    saveHistory(newHistory);
  };

  const handleDelete = (id) => {
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
  };

  return (
    <div className="calculator-section active">
      <div className="description">
        시작 말씀과 끝 말씀을 입력하면, <strong>총 읽어야 할 장 수</strong>를 계산해 드립니다.
      </div>

      <div className="input-group">
        <label>시작 성경</label>
        <select value={startBook} onChange={(e) => setStartBook(e.target.value)}>
          {bibleData.map(book => (
            <option key={book.name} value={book.name}>{book.name}</option>
          ))}
        </select>
      </div>
      
      <div className="input-group">
        <label>시작 장</label>
        <input 
          type="number" 
          value={startChapter} 
          onChange={(e) => setStartChapter(e.target.value)} 
          min="1" 
        />
      </div>

      <div className="divider">~ 부터 ~</div>

      <div className="input-group">
        <label>끝 성경</label>
        <select value={endBook} onChange={(e) => setEndBook(e.target.value)}>
          {bibleData.map(book => (
            <option key={book.name} value={book.name}>{book.name}</option>
          ))}
        </select>
      </div>
      
      <div className="input-group">
        <label>끝 장</label>
        <input 
          type="number" 
          value={endChapter} 
          onChange={(e) => setEndChapter(e.target.value)} 
          min="1" 
        />
      </div>

      <button className="action-btn" onClick={calculate}>계산하기</button>

      {result !== null && (
        <div className="result-box" style={{ color: '#1565c0' }}>
          총 읽어야 할 분량은 <br/><strong>{result}장</strong> 입니다.
          <button className="save-btn" onClick={handleSave}>결과 저장</button>
        </div>
      )}

      {error && (
        <div className="result-box" style={{ color: 'red' }}>
          ❌ {error}
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h3>저장된 기록</h3>
          <ul className="history-list">
            {history.map(item => (
              <li key={item.id} className="history-item">
                <span className="history-date">{item.date}</span>
                <span className="history-content">
                  {item.input} <br/> ➡ <strong>{item.result}</strong>
                </span>
                <button className="delete-btn-small" onClick={() => handleDelete(item.id)}>삭제</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CountCalculator;
