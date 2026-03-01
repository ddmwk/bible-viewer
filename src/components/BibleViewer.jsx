import React, { useState, useEffect, useRef } from 'react';
import { bibleData } from '../data/bibleData';

// Dynamically import all JSON files from src/data/json
// Key: relative path (e.g., "../data/json/01창세기/창세기_01.json")
// Value: import function returning a Promise
const bibleJsonFiles = import.meta.glob('../data/json/**/*.json');

function BibleViewer() {
    // State
    const [selectedBook, setSelectedBook] = useState(bibleData[0]); // Default Genesis
    const [chapter, setChapter] = useState(1);
    const [content, setContent] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bookmarks, setBookmarks] = useState([]);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [toast, setToast] = useState(null); // Toast message state

    // Load bookmarks on mount
    useEffect(() => {
        const saved = localStorage.getItem('bible_bookmarks');
        if (saved) {
            setBookmarks(JSON.parse(saved));
        }
    }, []);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    const saveBookmark = () => {
        const now = new Date();
        const newBookmark = {
            id: Date.now(),
            bookName: selectedBook.name,
            chapter: chapter,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        const updated = [newBookmark, ...bookmarks];
        setBookmarks(updated);
        localStorage.setItem('bible_bookmarks', JSON.stringify(updated));
        showToast(`북마크 저장됨: ${selectedBook.name} ${chapter}장`);
    };

    const deleteBookmark = (id, e) => {
        e.stopPropagation(); // Prevent triggering loadBookmark
        const updated = bookmarks.filter(b => b.id !== id);
        setBookmarks(updated);
        localStorage.setItem('bible_bookmarks', JSON.stringify(updated));
    };

    const loadBookmark = (bookmark) => {
        const book = bibleData.find(b => b.name === bookmark.bookName);
        if (book) {
            setSelectedBook(book);
            setChapter(bookmark.chapter);
            setShowBookmarks(false); // Close modal
        }
    };

    // Load Content whenever Book or Chapter changes
    useEffect(() => {
        const loadChapter = async () => {
            setLoading(true);
            setError(null);
            setContent([]); 

            try {
                const chapterPad = String(chapter).padStart(2, '0');
                const targetFileName = `${selectedBook.name}_${chapterPad}.json`.normalize('NFC');

                const fileKey = Object.keys(bibleJsonFiles).find(key => {
                    const normalizedKey = key.normalize('NFC');
                    return normalizedKey.endsWith(targetFileName);
                });

                if (!fileKey) {
                    console.warn(`File not found for: ${targetFileName}`);
                    throw new Error("파일을 찾을 수 없습니다.");
                }

                const mod = await bibleJsonFiles[fileKey]();
                const jsonContent = mod.default || mod;

                if (jsonContent && jsonContent.verses) {
                    setContent(jsonContent.verses);
                } else {
                    setContent([]);
                    setError("데이터 형식이 올바르지 않습니다.");
                }

            } catch (err) {
                console.error("Failed to load bible data:", err);
                setContent([]);
                setError("성경 데이터를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadChapter();
        window.scrollTo(0, 0); 
    }, [selectedBook, chapter]);

    // Navigation Handlers
    const handleNextChapter = () => {
        if (chapter < selectedBook.chapters) {
            setChapter(chapter + 1);
        } else {
            const currentIndex = bibleData.findIndex(b => b.name === selectedBook.name);
            if (currentIndex !== -1 && currentIndex < bibleData.length - 1) {
                if(confirm("다음 권으로 이동하시겠습니까?")) {
                    setSelectedBook(bibleData[currentIndex + 1]);
                    setChapter(1);
                }
            } else {
                alert("성경의 마지막입니다.");
            }
        }
    };

    const handlePrevChapter = () => {
        if (chapter > 1) {
            setChapter(chapter - 1);
        } else {
             const currentIndex = bibleData.findIndex(b => b.name === selectedBook.name);
             if (currentIndex > 0) {
                 if(confirm("이전 권으로 이동하시겠습니까?")) {
                    const prevBook = bibleData[currentIndex - 1];
                    setSelectedBook(prevBook);
                    setChapter(prevBook.chapters); 
                 }
             }
        }
    };

    return (
        <div className="bible-viewer">
            {/* Controls */}
            <div className="controls" style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '20px', 
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <select 
                    value={selectedBook.name} 
                    onChange={(e) => {
                        const book = bibleData.find(b => b.name === e.target.value);
                        setSelectedBook(book);
                        setChapter(1);
                    }}
                    style={{ padding: '10px', fontSize: '1rem', flex: '1', minWidth: '120px' }}
                >
                    {bibleData.map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                </select>

                <select 
                    value={chapter} 
                    onChange={(e) => setChapter(Number(e.target.value))}
                    style={{ padding: '10px', fontSize: '1rem', width: '80px' }}
                >
                    {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}장</option>
                    ))}
                </select>

                <button 
                    onClick={saveBookmark}
                    title="현재 위치 북마크 저장"
                    style={{ 
                        background: 'none', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}
                >
                    📌
                </button>
            </div>

            {/* Navigation Buttons (Top) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <button 
                    onClick={handlePrevChapter} 
                    className="action-btn"
                    style={{ flex: 1, marginRight: '5px', visibility: (chapter === 1 && bibleData.findIndex(b => b.name === selectedBook.name) === 0) ? 'hidden' : 'visible' }}
                >
                    ◀ 이전
                </button>
                <button 
                    onClick={handleNextChapter} 
                    className="action-btn"
                    style={{ flex: 1, marginLeft: '5px' }}
                >
                    다음 ▶
                </button>
            </div>

            {/* Content Display */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>
            ) : (
                <div className="bible-content" style={{
                    textAlign: 'left', 
                    lineHeight: '1.8', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    border: '1px solid #eee',
                    minHeight: '300px',
                    fontSize: '1.1em'
                }}>
                    <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        {selectedBook.name} {chapter}장
                    </h2>
                    
                    {content.length > 0 ? (
                        content.map((verse, index) => (
                            <div key={index} style={{ marginBottom: '10px', display: 'flex', alignItems: 'flex-start' }}>
                                <span style={{ 
                                    fontSize: '0.7em', 
                                    color: '#888', 
                                    marginRight: '8px', 
                                    marginTop: '5px',
                                    minWidth: '20px',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                    fontWeight: 'bold'
                                }}>
                                    {index + 1}
                                </span>
                                <span style={{ flex: 1 }}>{verse}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                            내용이 없습니다.
                        </div>
                    )}
                </div>
            )}

            {/* Navigation Buttons (Bottom) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button 
                    onClick={handlePrevChapter} 
                    className="action-btn"
                    style={{ flex: 1, marginRight: '5px', visibility: (chapter === 1 && bibleData.findIndex(b => b.name === selectedBook.name) === 0) ? 'hidden' : 'visible' }}
                >
                    ◀ 이전
                </button>
                <button 
                    onClick={handleNextChapter} 
                    className="action-btn"
                    style={{ flex: 1, marginLeft: '5px' }}
                >
                    다음 ▶
                </button>
            </div>

            {/* Floating Action Button for Bookmark List */}
            <button 
                className="fab-btn"
                onClick={() => setShowBookmarks(true)}
                title="북마크 목록"
            >
                📑
            </button>

            {/* Bookmark Modal */}
            {showBookmarks && (
                <div className="bookmark-overlay" onClick={() => setShowBookmarks(false)}>
                    <div className="bookmark-modal" onClick={e => e.stopPropagation()}>
                        <div className="bookmark-header">
                            <h3>북마크 목록</h3>
                            <button className="close-modal-btn" onClick={() => setShowBookmarks(false)}>&times;</button>
                        </div>
                        <div className="bookmark-list-container">
                            {bookmarks.length === 0 ? (
                                <div className="empty-message">저장된 북마크가 없습니다.</div>
                            ) : (
                                bookmarks.map(b => (
                                    <div key={b.id} className="bookmark-item" onClick={() => loadBookmark(b)} title="클릭하여 이동">
                                        <div className="bookmark-info">
                                            <span className="bookmark-title">{b.bookName} {b.chapter}장</span>
                                            <span className="bookmark-date">{b.date} {b.time}</span>
                                        </div>
                                        <button className="delete-bookmark-btn" onClick={(e) => deleteBookmark(b.id, e)}>
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
            {toast && (
                <div className="toast-message">
                    {toast}
                </div>
            )}
        </div>
    );
}

export default BibleViewer;
