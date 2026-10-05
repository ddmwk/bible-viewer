import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronRight, House, ListChecks, CalendarDays, Settings, Download, Upload, ArrowUpRight, Sprout, WifiOff } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { BOOKS, CHAPTERS, TOTAL_CHAPTERS, STORAGE_KEY, freshState, validateState, localDate, calculatePlan, pendingChapters, toggleChapter, positionIndex, destination, rangeCount } from './model';
import './style.css';
import CompactSelect from './CompactSelect';
function initialData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return {
      data: raw ? validateState(JSON.parse(raw)) : freshState(),
      error: ''
    };
  } catch {
    return {
      data: freshState(),
      error: '저장된 기록을 읽을 수 없습니다. 원본 보호를 위해 저장을 멈췄습니다. 백업 파일을 복원하거나 원본을 먼저 내려받아 주세요.'
    };
  }
}
function downloadFile(content, name) {
  const url = URL.createObjectURL(new Blob([content], {
    type: 'application/json'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const chapterLabel = c => `${BOOKS[c.bookIndex].name} ${c.chapter}장`;
function Position({
  label,
  value,
  onChange
}) {
  return <fieldset className="position"><legend>{label}</legend><div className="input-row"><CompactSelect label={`${label} 성경`} value={value.book} options={BOOKS.map((b, i) => ({ value: i, label: b.name }))} onChange={book => onChange({
        book,
        chapter: 1
      })} /><CompactSelect label={`${label} 장`} value={value.chapter} onChange={chapter => onChange({
        ...value,
        chapter
      })} options={Array.from({
          length: BOOKS[value.book].chapters
        }, (_, i) => ({ value: i + 1, label: `${i + 1}장` }))} /></div></fieldset>;
}
export default function App() {
  const [initial] = useState(initialData);
  const [data, setData] = useState(initial.data);
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [error, setError] = useState(initial.error);
  const [tab, setTab] = useState('today');
  const [book, setBook] = useState(0);
  const [filter, setFilter] = useState('old');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [install, setInstall] = useState(null);
  const [today, setToday] = useState(localDate());
  const [undo, setUndo] = useState(null);
  const fileInput = useRef(null);
  const plan = calculatePlan(data.completed, data.targetDate, data.dailyChapters, new Date(`${today}T12:00:00`));
  const done = new Set(data.completed);
  const next = pendingChapters(data.completed, plan.requiredDaily ?? data.dailyChapters, data.startChapter);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    const date = () => setToday(localDate());
    const prompt = e => {
      e.preventDefault();
      setInstall(e);
    };
    const installed = () => setInstall(null);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('focus', date);
    const timer = setInterval(date, 60000);
    registerSW({
      onOfflineReady: () => setOfflineReady(true),
      onRegisterError: () => setNotice('오프라인 준비에 실패했습니다. 연결 상태를 확인한 후 다시 열어 주세요.')
    });
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('focus', date);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  function save(nextData, message = '', restoring = false) {
    if (blocked && !restoring) {
      setTab('settings');
      return false;
    }
    try {
      const valid = validateState(nextData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      setData(valid);
      setError('');
      setBlocked(false);
      if (message) setNotice(message);
      return true;
    } catch {
      setError('기록을 저장하지 못했습니다. 저장 공간과 브라우저의 사이트 저장 허용을 확인해 주세요.');
      return false;
    }
  }
  function record(ids, message) {
    const previous = data.completed;
    if (save({
      ...data,
      completed: [...new Set([...data.completed, ...ids])]
    }, message)) setUndo(previous);
  }
  function navigate(value) {
    setTab(value);
    window.scrollTo({
      top: 0
    });
  }
  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error('백업 파일이 너무 큽니다.');
      const imported = validateState(JSON.parse(await file.text()));
      if (window.confirm(`현재 기록을 백업 파일의 ${imported.completed.length}장 기록으로 바꿀까요? 기존 기록은 먼저 백업해 주세요.`)) {
        if (save(imported, '백업 기록을 복원했습니다.', true)) setUndo(null);
      }
    } catch (err) {
      setNotice(err instanceof SyntaxError ? '올바른 JSON 백업 파일이 아닙니다.' : err.message);
    }
  }
  const nav = [['today', House, '오늘'], ['record', ListChecks, '읽기 기록'], ['plan', CalendarDays, '계획·계산'], ['settings', Settings, '설정']];
  return <div className="app">
    <header className="brand"><div className="brand-name"><BookOpen size={24} /><span>한 장씩<span className="brand-dot">.</span></span></div><span className="brand-caption">나의 성경 읽기</span></header>
    <main>
      {offline && <p className="offline"><WifiOff size={16} /> 오프라인 · 기록과 계산을 계속 사용할 수 있어요</p>}
      {error && <div role="alert" className="error">{error}<button onClick={() => navigate('settings')}>기록 관리 열기</button></div>}
      {tab === 'today' && <>
        <div className="page-heading"><p className="eyebrow">{new Date(`${today}T12:00:00`).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}</p><h1>한 장씩, 꾸준히.</h1><p>오늘의 작은 읽기가 쌓여 완독이 됩니다.</p></div>
        <section className="hero" aria-labelledby="progress-title"><div className="hero-top"><span id="progress-title">나의 통독 여정</span><span className="pill">성경 1독</span></div><div className="progress-number">{plan.percent.toFixed(1)}<span>%</span><Sprout className="sprout" size={58} strokeWidth={1} /></div><progress max={TOTAL_CHAPTERS} value={plan.read} aria-label="전체 성경 읽기 진도" /><div className="hero-bottom"><span><strong>{plan.read.toLocaleString()}</strong>장 읽음</span><span>전체 1,189장</span></div><div className="hero-stats"><div><span>앞으로 읽을 분량</span><strong>{plan.remaining.toLocaleString()}<small>장</small></strong></div><div><span>{data.targetDate ? '목표일까지' : '하루 읽기 목표'}</span><strong>{data.targetDate ? Math.max(0, plan.daysLeft) : data.dailyChapters}<small>{data.targetDate ? '일' : '장'}</small></strong></div></div></section>
        <section className="section"><div className="section-title"><h2>다음 읽을 분량</h2><button className="text-button" onClick={() => navigate('plan')}>시작 위치·목표 변경 <ChevronRight size={15} /></button></div><div className="card next-card"><div className="small-icon"><BookOpen size={22} /></div><p className="eyebrow">{data.targetDate && plan.daysLeft > 0 ? '목표일에 맞춘 추천' : '나의 하루 페이스'}</p><h3>{next.length ? chapterLabel(next[0]) : '성경 한 권의 여정, 완독!'}</h3><p>{next.length > 1 ? `${chapterLabel(next.at(-1))}까지 · 미완료 ${next.length}장` : next.length ? '한 장을 읽고 완료를 눌러 주세요.' : '1,189장을 모두 읽었습니다. 수고하셨어요.'}</p>{next.length > 0 && <button className="primary" disabled={blocked} onClick={() => record(next.map(c => c.id), `${next.length}장을 읽기 완료로 기록했습니다.`)}><Check size={19} /> {next.length}장 읽기 완료</button>}<p className="fine-print">설정한 시작 장부터 이미 읽은 장을 제외하고 추천해요. 마지막 장 이후에는 창세기로 이어져요.</p></div></section>
        {data.targetDate && plan.daysLeft <= 0 && plan.remaining > 0 && <p className="hint">목표일이 지났어요. 계획·계산에서 새 날짜를 정해 보세요.</p>}
        <button className="wide-link" onClick={() => navigate('record')}><span><strong>이미 읽은 곳이 있나요?</strong><small>장별 체크 또는 구간으로 한 번에 기록하세요.</small></span><ArrowUpRight size={22} /></button>
      </>}
      {tab === 'record' && <>
        <div className="page-heading"><p className="eyebrow">MY READING</p><h1>읽은 만큼, 기록.</h1><p>장을 누르면 완료, 다시 누르면 취소됩니다.</p></div>
        <div className="segmented" aria-label="구약 신약 선택">{[['old', '구약', 929], ['new', '신약', 260]].map(([key, label, total]) => <button key={key} aria-pressed={filter === key} className={filter === key ? 'selected' : ''} onClick={() => {
            setFilter(key);
            setBook(key === 'old' ? 0 : 39);
            setSearch('');
          }}>{label} <span>{data.completed.filter(id => BOOKS[Number(id.split(':')[0])].testament === key).length}/{total}</span></button>)}</div>
        <label className="search-label">성경 찾기<input type="search" placeholder="성경 이름 검색" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="book-select"><label htmlFor="book">성경 선택</label><CompactSelect id="book" label="성경 선택" value={book} onChange={setBook} options={BOOKS.flatMap((b, i) => b.testament === filter ? [{ value: i, label: `${b.name} · ${data.completed.filter(id => id.startsWith(`${i}:`)).length}/${b.chapters}장` }] : [])} /></div>
        {search && <div className="search-results">{BOOKS.map((b, i) => b.name.includes(search.trim()) && <button key={b.name} onClick={() => {
            setBook(i);
            setFilter(b.testament);
            setSearch('');
          }}>{b.name}<ChevronRight size={16} /></button>)}{!BOOKS.some(b => b.name.includes(search.trim())) && <p>일치하는 성경이 없습니다.</p>}</div>}
        <section className="card chapter-card"><div className="section-title"><h2>{BOOKS[book].name}</h2><span>{data.completed.filter(id => id.startsWith(`${book}:`)).length} / {BOOKS[book].chapters}장</span></div><div className="chapters">{Array.from({
              length: BOOKS[book].chapters
            }, (_, i) => {
              const id = `${book}:${i + 1}`;
              return <button key={id} aria-label={`${BOOKS[book].name} ${i + 1}장`} aria-pressed={done.has(id)} disabled={blocked} className={done.has(id) ? 'checked' : ''} onClick={() => {
                if (save({
                  ...data,
                  completed: toggleChapter(data.completed, id)
                })) setUndo(null);
              }}>{done.has(id) && <Check size={11} />}<span>{i + 1}</span></button>;
            })}</div><p className="legend"><span /> 읽기 완료 <span /> 아직 안 읽음</p></section>
        <RangeRecorder disabled={blocked} onRecord={record} />
      </>}
      {tab === 'plan' && <>
        <div className="page-heading"><p className="eyebrow">AT YOUR OWN PACE</p><h1>나에게 맞는 속도.</h1><p>남은 분량을 나누면 목표가 가까워집니다.</p></div>
        <PlanForm data={data} plan={plan} today={today} onSave={save} />
        <Calculators />
      </>}
      {tab === 'settings' && <>
        <div className="page-heading"><p className="eyebrow">MAKE IT YOURS</p><h1>언제나, 내 곁에.</h1><p>홈 화면에 두고 편하게 기록하세요.</p></div>
        <section className="card"><div className="small-icon"><Download size={22} /></div><h2>앱처럼 사용하기</h2><p>한 번 연결해 열어 두면, 오프라인에서도 기록과 계산을 사용할 수 있어요.</p>{install && <button className="primary" onClick={async () => {
            await install.prompt();
            setInstall(null);
          }}>홈 화면에 설치</button>}<div className="install-guide"><strong>iPhone · Safari</strong><p>공유 메뉴 → 홈 화면에 추가 → 추가</p><strong>Android · Chrome</strong><p>⋮ 메뉴 → 앱 설치 또는 홈 화면에 추가</p></div><p className="fine-print">{offlineReady ? '오프라인 사용 준비가 완료되었습니다.' : '설치는 HTTPS로 접속한 배포 주소에서 지원됩니다.'}</p></section>
        <section className="card section"><h2>내 기록 보관하기</h2><p>기록은 이 기기의 브라우저에 저장됩니다. 기기를 바꾸거나 사이트 데이터를 지우기 전에 백업하세요. 자동 동기화는 하지 않습니다.</p><div className="button-stack"><button className="secondary" onClick={() => downloadFile(JSON.stringify(data, null, 2), `한장씩-백업-${today}.json`)}><Download size={18} /> 기록 백업하기</button><button className="secondary" onClick={() => fileInput.current.click()}><Upload size={18} /> 백업 파일 복원</button><input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={importFile} />{blocked && <button className="secondary" onClick={() => {
              try {
                downloadFile(localStorage.getItem(STORAGE_KEY) || 'null', `한장씩-원본-${today}.json`);
              } catch {
                setNotice('저장소에 접근할 수 없습니다.');
              }
            }}>불러오지 못한 원본 내려받기</button>}</div><p className="fine-print">다른 브라우저나 홈 화면 앱으로 옮길 때에도 백업·복원을 사용하세요.</p></section>
        <section className="card section"><h2>한 장씩에 대하여</h2><p>성경 66권, 1,189장 기준으로 한 번의 통독을 기록합니다. 성경 본문은 포함하지 않습니다.</p><p>기존 앱의 마지막 열람 위치는 완료 기록이 아니므로 자동으로 가져오지 않습니다. 읽기 기록에서 이미 읽은 구간을 등록해 주세요.</p><button className="danger" onClick={() => {
            if (window.confirm('읽기 기록과 목표를 모두 초기화할까요? 백업하지 않은 기록은 되돌릴 수 없습니다.')) {
              if (save(freshState(), '새 통독 기록을 시작합니다.', true)) setUndo(null);
            }
          }}>기록 초기화</button></section>
      </>}
      {undo && <div className="undo"><span>완료 기록을 저장했어요.</span><button onClick={() => {
          if (save({
            ...data,
            completed: undo
          }, '기록을 되돌렸습니다.')) setUndo(null);
        }}>되돌리기</button></div>}
      <p className="footer">한 장씩 쌓이는 나의 여정</p>
    </main>
    <nav className="bottom-nav" aria-label="주 메뉴">{nav.map(([key, Icon, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => navigate(key)}><Icon size={22} strokeWidth={tab === key ? 2 : 1.6} /><span>{label}</span></button>)}</nav>
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast">{notice}</div>}</div>
  </div>;
}
function RangeRecorder({
  onRecord,
  disabled
}) {
  const [start, setStart] = useState({
    book: 0,
    chapter: 1
  });
  const [end, setEnd] = useState({
    book: 0,
    chapter: 1
  });
  const first = positionIndex(start.book, start.chapter),
    last = positionIndex(end.book, end.chapter);
  return <details className="card section"><summary>이미 읽은 구간 한 번에 기록</summary><p>시작 장과 끝 장을 모두 포함합니다. 기존 완료 기록은 중복 집계하지 않아요.</p><Position label="읽기 시작" value={start} onChange={setStart} /><Position label="읽기 끝" value={end} onChange={setEnd} />{last < first ? <p className="hint">끝 지점은 시작 지점 이후로 선택해 주세요.</p> : <button className="primary" disabled={disabled} onClick={() => onRecord(CHAPTERS.slice(first, last + 1).map(c => c.id), `${last - first + 1}장 구간을 기록했습니다.`)}>이 구간 {last - first + 1}장 완료</button>}</details>;
}
function PlanForm({
  data,
  plan,
  today,
  onSave
}) {
  const [date, setDate] = useState(data.targetDate);
  const [daily, setDaily] = useState(data.dailyChapters);
  const [start, setStart] = useState(() => {
    const [book, chapter] = data.startChapter.split(':').map(Number);
    return { book, chapter };
  });
  return <section className="card"><h2>나의 통독 목표</h2><form onSubmit={e => {
      e.preventDefault();
      onSave({
        ...data,
        startChapter: `${start.book}:${start.chapter}`,
        targetDate: date,
        dailyChapters: Number(daily)
      }, '읽기 목표를 저장했습니다.');
    }}><Position label="읽기 시작 위치" value={start} onChange={setStart} /><p className="fine-print">이 장부터 미완료 장을 순서대로 추천해요. 시작 위치를 바꿔도 완료 기록은 유지됩니다.</p><label>완독하고 싶은 날 <span className="optional">선택</span><input type="date" min={today} max="9999-12-31" value={date} onChange={e => setDate(e.target.value)} /></label>{date && <button type="button" className="text-button" onClick={() => setDate('')}>목표일 없이 읽기</button>}<label>나의 하루 페이스<div className="number-input"><input aria-label="하루 읽을 장 수" type="number" inputMode="numeric" min="1" max={TOTAL_CHAPTERS} required value={daily} onChange={e => setDaily(e.target.value)} /><span>장 / 하루</span></div></label><button className="primary" type="submit">목표 저장</button></form><div className="plan-result"><p>저장된 목표 기준</p>{plan.remaining === 0 ? <h3>통독을 완료했어요!</h3> : <><h3>{plan.requiredDaily !== null ? `하루 ${plan.requiredDaily}장이면 완독` : `하루 ${data.dailyChapters}장씩, ${plan.estimatedDays}일`}</h3><p>{data.targetDate && plan.daysLeft <= 0 ? '목표일이 지났습니다. 새로운 목표일을 정해 주세요.' : plan.requiredDaily !== null ? `오늘 포함 ${plan.daysLeft}일 동안 남은 ${plan.remaining}장을 읽어요.` : `오늘 시작하면 ${plan.estimatedDate} 완독 예상`}</p></>}<small>분량은 장 수 기준이며, 장마다 읽는 시간은 달라요.</small></div></section>;
}
function Calculators() {
  const [mode, setMode] = useState('target');
  const [start, setStart] = useState({
    book: 0,
    chapter: 1
  });
  const [end, setEnd] = useState({
    book: 0,
    chapter: 1
  });
  const [count, setCount] = useState(3);
  const [times, setTimes] = useState(1);
  let result = '';
  try {
    result = mode === 'target' ? chapterLabel(destination(start.book, start.chapter, Number(count))) : mode === 'range' ? `총 ${rangeCount(start.book, start.chapter, end.book, end.chapter)}장` : Number.isInteger(Number(times)) && Number(times) > 0 && Number(times) <= 100 ? `하루 ${Math.ceil(TOTAL_CHAPTERS * Number(times) / 365)}장` : '회독 수는 1~100으로 입력해 주세요.';
  } catch (err) {
    result = err.message;
  }
  return <section className="card section"><h2>분량 계산기</h2><p>기존 계산기를 한곳에 모았어요.</p><div className="calc-tabs">{[['target', '어디까지'], ['range', '총 몇 장'], ['year', '연간 회독']].map(([key, label]) => <button key={key} aria-pressed={mode === key} className={mode === key ? 'selected' : ''} onClick={() => setMode(key)}>{label}</button>)}</div>{mode !== 'year' && <Position label="시작" value={start} onChange={setStart} />}{mode === 'target' && <label>읽을 분량 (시작 장 포함)<input type="number" inputMode="numeric" min="1" max="1000000" value={count} onChange={e => setCount(e.target.value)} /></label>}{mode === 'range' && <Position label="끝" value={end} onChange={setEnd} />}{mode === 'year' && <label>1년에 읽을 횟수<input type="number" inputMode="numeric" min="1" max="100" value={times} onChange={e => setTimes(e.target.value)} /></label>}<output className="calc-result" aria-live="polite">{result}</output><p className="fine-print">{mode === 'year' ? '365일 기준 · 현재 진도와 별도로 계산해요.' : '시작과 끝 장 포함 · 끝을 넘으면 창세기로 이어져요.'}</p></section>;
}
