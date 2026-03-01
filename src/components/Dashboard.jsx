import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();
    const [targetHistory, setTargetHistory] = useState([]);
    const [countHistory, setCountHistory] = useState([]);
    const [dailyHistory, setDailyHistory] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);

    useEffect(() => {
        const loadData = () => {
            try {
                setTargetHistory(JSON.parse(localStorage.getItem('target_history') || '[]'));
                setCountHistory(JSON.parse(localStorage.getItem('count_history') || '[]'));
                setDailyHistory(JSON.parse(localStorage.getItem('daily_history') || '[]'));
                setBookmarks(JSON.parse(localStorage.getItem('bible_bookmarks') || '[]'));
            } catch (e) {
                console.error("Failed to load dashboard data", e);
            }
        };
        loadData();
        
        // Listen for storage events to update real-time if multiple tabs are open (optional but nice)
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const getLastItem = (arr) => arr.length > 0 ? arr[0] : null;

    return (
        <div className="dashboard fade-in">
            <h2 className="dashboard-title">나의 성경 통독 현황</h2>
            
            <div className="dashboard-grid">
                {/* 1. Target Calculator Summary */}
                <div className="dashboard-card" onClick={() => navigate('/target')}>
                    <div className="card-header">
                        <h3>📊 어디까지?</h3>
                        <span className="card-arrow">➜</span>
                    </div>
                    <div className="card-content">
                        {getLastItem(targetHistory) ? (
                            <>
                                <p className="card-label">최근 계산</p>
                                <p className="card-main-text">
                                    {getLastItem(targetHistory).input}
                                </p>
                                <p className="card-sub-text">결과: {getLastItem(targetHistory).result}</p>
                                <p className="card-date">{getLastItem(targetHistory).date}</p>
                            </>
                        ) : (
                            <p className="empty-text">아직 계산 기록이 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 2. Count Calculator Summary */}
                <div className="dashboard-card" onClick={() => navigate('/count')}>
                    <div className="card-header">
                        <h3>🔢 총 몇 장?</h3>
                        <span className="card-arrow">➜</span>
                    </div>
                    <div className="card-content">
                        {getLastItem(countHistory) ? (
                            <>
                                <p className="card-label">최근 계산</p>
                                <p className="card-main-text">
                                    {getLastItem(countHistory).input}
                                </p>
                                <p className="card-sub-text">결과: {getLastItem(countHistory).result}</p>
                                <p className="card-date">{getLastItem(countHistory).date}</p>
                            </>
                        ) : (
                            <p className="empty-text">아직 계산 기록이 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 3. Daily Calculator Summary */}
                <div className="dashboard-card" onClick={() => navigate('/daily')}>
                    <div className="card-header">
                        <h3>📅 하루 몇 장?</h3>
                        <span className="card-arrow">➜</span>
                    </div>
                    <div className="card-content">
                        {getLastItem(dailyHistory) ? (
                            <>
                                <p className="card-label">현재 목표</p>
                                <p className="card-main-text">
                                    {getLastItem(dailyHistory).input}
                                </p>
                                <p className="card-sub-text">목표: {getLastItem(dailyHistory).result}</p>
                                <p className="card-date">{getLastItem(dailyHistory).date}</p>
                            </>
                        ) : (
                            <p className="empty-text">목표가 설정되지 않았습니다.</p>
                        )}
                    </div>
                </div>

                {/* 4. Bookmarks Summary */}
                <div className="dashboard-card" onClick={() => navigate('/viewer')}>
                    <div className="card-header">
                        <h3>📑 북마크</h3>
                        <span className="card-arrow">➜</span>
                    </div>
                    <div className="card-content">
                        {bookmarks.length > 0 ? (
                            <>
                                <p className="card-label">최근 읽은 곳</p>
                                {bookmarks.slice(0, 3).map(b => (
                                    <div key={b.id} className="mini-bookmark-item">
                                        <span className="mini-bookmark-icon">📌</span>
                                        <span className="mini-bookmark-text">{b.bookName} {b.chapter}장</span>
                                        <span className="mini-bookmark-time">{b.date}</span>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="empty-text">저장된 북마크가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
