import React, { useState } from 'react';
import { bibleData } from '../data/bibleData';

function TargetCalculator() {
  const [startBook, setStartBook] = useState(bibleData[0].name);
  const [startChapter, setStartChapter] = useState(1);
  const [count, setCount] = useState(10);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('target_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('target_history', JSON.stringify(newHistory));
  };

  const calculate = () => {
    let bookIndex = bibleData.findIndex(b => b.name === startBook);
    let currentChapter = parseInt(startChapter);
    let remainingChapters = parseInt(count) - 1;

    // Validation
    const startBookData = bibleData[bookIndex];
    if (currentChapter > startBookData.chapters || currentChapter < 1) {
      setError(`${startBook}은(는) 1장부터 ${startBookData.chapters}장까지만 있습니다.`);
      setResult(null);
      return;
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

    setResult(`${bibleData[bookIndex].name} ${currentChapter}장`);
    setError(null);
  };

  const handleSave = () => {
    if (!result) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `${startBook} ${startChapter}장 + ${count}장`,
      result: result
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
        시작하는 곳과 읽을 장 수를 입력하면, <strong>마지막에 읽게 될 말씀</strong>이 어디인지 알려드립니다.
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
        <label>시작 장 (Chapter)</label>
        <input 
          type="number" 
          value={startChapter} 
          onChange={(e) => setStartChapter(e.target.value)} 
          min="1" 
        />
      </div>

      <div className="input-group">
        <label>읽을 장 수 (Count)</label>
        <input 
          type="number" 
          value={count} 
          onChange={(e) => setCount(e.target.value)} 
          min="1" 
        />
      </div>

      <button className="action-btn" onClick={calculate}>계산하기</button>

      {result && (
        <div className="result-box" style={{ color: '#1565c0' }}>
          오늘 읽으면 <br/><strong>{result}</strong> 까지 읽게 됩니다!
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

export default TargetCalculator;
