import React from 'react';

function Header({ currentTheme, onThemeChange }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <h1>📖 성경 통독 계산기</h1>
      <div className="theme-switcher" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button 
            onClick={() => onThemeChange('light')}
            style={{ 
                background: currentTheme === 'light' ? '#ddd' : 'none', 
                border: '1px solid #ccc', 
                borderRadius: '20px', 
                padding: '5px 15px', 
                cursor: 'pointer' 
            }}
        >
            ☀️ 기본
        </button>
        <button 
            onClick={() => onThemeChange('dark')}
            style={{ 
                background: currentTheme === 'dark' ? '#555' : 'none', 
                color: currentTheme === 'dark' ? '#fff' : 'inherit',
                border: '1px solid #ccc', 
                borderRadius: '20px', 
                padding: '5px 15px', 
                cursor: 'pointer' 
            }}
        >
            🌙 다크
        </button>
        <button 
            onClick={() => onThemeChange('green')}
            style={{ 
                background: currentTheme === 'green' ? '#a5d6a7' : 'none', 
                color: currentTheme === 'green' ? '#1b5e20' : 'inherit',
                border: '1px solid #ccc', 
                borderRadius: '20px', 
                padding: '5px 15px', 
                cursor: 'pointer' 
            }}
        >
            🌿 편안함
        </button>
      </div>
    </div>
  );
}

export default Header;
