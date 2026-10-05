import { useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export default function CompactSelect({ id, label, value, options, onChange }) {
  const dialog = useRef(null);
  const list = useRef(null);
  const titleId = useId();
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value);
  const matches = options.filter(option => option.label.includes(query.trim()));

  function choose(option) {
    onChange(option.value);
    dialog.current.close();
  }

  return <>
    <button id={id} type="button" className="compact-select" aria-label={label} aria-haspopup="dialog" onClick={() => {
      setQuery('');
      dialog.current.showModal();
      list.current.scrollTop = 0;
    }}><span>{selected?.label}</span><ChevronDown size={17} /></button>
    <dialog ref={dialog} className="select-dialog" aria-labelledby={titleId} onClick={event => {
      if (event.target !== dialog.current) return;
      const rect = dialog.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close();
    }}>
      <div className="select-dialog-heading"><h2 id={titleId}>{label}</h2><button type="button" aria-label="선택창 닫기" onClick={() => dialog.current.close()}><X size={20} /></button></div>
      <input autoFocus type="search" aria-label={`${label} 검색`} placeholder="이름이나 번호로 검색" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          list.current.querySelector('button')?.focus();
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (matches.length === 1) choose(matches[0]);
        }
      }} />
      <div className="select-options" ref={list} onKeyDown={event => {
        const buttons = [...list.current.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
        }
      }}>
        {matches.map(option => <button type="button" key={option.value} aria-pressed={option.value === value} onClick={() => choose(option)}><span>{option.label}</span>{option.value === value && <Check size={18} />}</button>)}
        {!matches.length && <p role="status">일치하는 항목이 없습니다.</p>}
      </div>
    </dialog>
  </>;
}
