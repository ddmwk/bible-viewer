import React, { useState, useEffect } from 'react';
import { bibleData } from '../data/bibleData';

function DailyCalculator() {
  const [times, setTimes] = useState(1);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Calculate total chapters in the Bible
  const totalChapters = bibleData.reduce((sum, book) => sum + book.chapters, 0);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('daily_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem('daily_history', JSON.stringify(newHistory));
  };

  const calculate = () => {
    // Standard year 365 days
    const days = 365;
    const totalToRead = totalChapters * parseInt(times);
    const dailyCount = Math.ceil(totalToRead / days);
    
    setResult(dailyCount);
  };

  const handleSave = () => {
    if (!result) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newItem = {
      id: Date.now(),
      date: `${now.toLocaleDateString()} ${timeString}`,
      input: `1년 ${times}회독`,
      result: `하루 약 ${result}장`
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
        1년에 성경을 <strong>몇 회독</strong> 하고 싶으신가요?<br/>
        하루에 몇 장을 읽어야 목표를 달성할 수 있는지 알려드립니다.
      </div>

      <div className="input-group">
        <label>목표 회독 수</label>
        <input 
          type="number" 
          value={times} 
          onChange={(e) => setTimes(e.target.value)} 
          min="1" 
        />
      </div>

      <button className="action-btn" onClick={calculate}>계산하기</button>

      {result && (
        <div className="result-box" style={{ color: '#1565c0' }}>
          매일 <strong>{result}장</strong>씩 읽으면<br/>
          1년에 <strong style={{color:'#e91e63'}}>{times}독</strong>을 할 수 있습니다!
          <button className="save-btn" onClick={handleSave}>결과 저장</button>
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

export default DailyCalculator;
