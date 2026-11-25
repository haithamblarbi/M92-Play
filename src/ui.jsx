import React, { useReducer } from 'react';
import { Crown } from 'lucide-react';
import { clean, dirOf } from './text.js';

/* مكونات ودوال مشتركة بين الألعاب */

export const HOST = 'M92';
export const rnd = n => Math.floor(Math.random() * n);
export const pick = a => a[rnd(a.length)];
export const useForce = () => useReducer(x => x + 1, 0)[1];
export const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** اسم مشاهد/كلمة: يضبط الاتجاه تلقائيًا كي لا تنقلب الأرقام والرموز في الواجهة المختلطة */
export const T = ({ children, className }) => <bdi dir="auto" className={className}>{clean(children)}</bdi>;
export { dirOf };

export function Shell({ title, side, sideTitle = 'إعدادات الجولة', sideEyebrow = 'لوحة المضيف', children }) {
  return <>
    <section className="play-panel">
      <div className="panel-heading"><div><span className="eyebrow">منطقة اللعب</span><h2>{title}</h2></div></div>
      {children}
    </section>
    <aside className="side-panel">
      <div className="panel-heading"><div><span className="eyebrow">{sideEyebrow}</span><h3>{sideTitle}</h3></div><Crown size={20} /></div>
      {side}
    </aside>
  </>;
}

export const Row = ({ k, v }) => <div className="setting-row"><span>{k}</span><strong>{v}</strong></div>;

export const Person = ({ name, i, end }) => <div className="person-row">
  <span className={`person-avatar av-${i % 4}`}>{clean(name).slice(0, 1)}</span>
  <T>{name}</T>
  <span style={{ marginRight: 'auto' }}>{end}</span>
</div>;

/** مجموعة أزرار اختيار (segmented) */
export function Seg({ value, options, onChange, label }) {
  return <div className="seg-wrap">
    {label && <span className="seg-label">{label}</span>}
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  </div>;
}
