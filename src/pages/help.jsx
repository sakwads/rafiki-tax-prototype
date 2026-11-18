import { useEffect, useState } from "react";
import { Alert, Button, Icon } from "../components/ui.jsx";
import { navigate } from "../router.js";
import { HELP, HELP_FLAT, slug } from "../data/help.js";

// Help: Focus shell, side menu | article | On this page. Matches Figma "08. Help".
export function HelpPage({ id }) {
  const idx = Math.max(0, HELP_FLAT.findIndex((p) => p.id === id));
  const page = HELP_FLAT[idx];
  const [open, setOpen] = useState(() => new Set([page.group]));
  const [active, setActive] = useState(0);
  useEffect(() => { setOpen((o) => new Set([...o, page.group])); setActive(0); document.getElementById("content")?.scrollTo(0, 0); }, [page.id]);

  // Highlight the section in view.
  useEffect(() => {
    const root = document.getElementById("content");
    if (!root) return;
    const onScroll = () => {
      const secs = [...document.querySelectorAll(".help-sec")];
      let a = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < 220) a = i; });
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) a = secs.length - 1;
      setActive(a);
    };
    root.addEventListener("scroll", onScroll);
    return () => root.removeEventListener("scroll", onScroll);
  }, [page.id]);

  const toggle = (g) => setOpen((o) => { const n = new Set(o); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const jump = (i) => { document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); setActive(i); };
  const prev = HELP_FLAT[idx - 1];
  const next = HELP_FLAT[idx + 1];

  return (
    <div className="help">
      <nav className="help-menu" aria-label="Help topics">
        {HELP.map((g) => {
          const isOpen = open.has(g.group);
          return (
            <div key={g.group} className="help-group">
              <button type="button" className="help-group__btn t-semi2 c-primary" aria-expanded={isOpen} onClick={() => toggle(g.group)}>
                <span>{g.group}</span><Icon name={isOpen ? "chevron-down" : "chevron-right"} size={20} />
              </button>
              {isOpen && (
                <ul className="help-group__list">
                  {g.pages.map((p) => {
                    const pid = slug(p.title);
                    const cur = pid === page.id;
                    return (
                      <li key={pid}>
                        <a href={`#/help/${pid}`} className={`help-item t-body2 ${cur ? "help-item--active" : ""}`} aria-current={cur ? "page" : undefined}>{p.title}</a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <article className="help-article" aria-labelledby="help-title">
        <header className="help-article__head">
          <p className="t-overline c-secondary">{page.group}</p>
          <h1 id="help-title" className="help-article__title c-primary">{page.title}</h1>
          <p className="help-article__intro c-secondary">{page.intro}</p>
        </header>
        <hr className="help-rule" />
        {page.s.map((s, i) => (
          <section key={s.h} id={`sec-${i}`} className="help-sec" aria-labelledby={`sec-${i}-h`}>
            <h2 id={`sec-${i}-h`} className="help-sec__h c-primary">{s.h}</h2>
            {(s.b || []).map((b) => <p key={b} className="help-sec__p c-primary">{b}</p>)}
            {s.l && (s.k === "Step"
              ? <ol className="help-list help-list--steps">{s.l.map((r, n) => <li key={r}><span className="help-step" aria-hidden="true">{n + 1}</span><span>{r}</span></li>)}</ol>
              : <ul className="help-list">{s.l.map((r) => <li key={r}><span className="help-dot" aria-hidden="true" /><span>{r}</span></li>)}</ul>)}
            {s.tip && <Alert tone="info" title={s.tip[0]}>{s.tip[1]}</Alert>}
          </section>
        ))}
        <footer className="help-foot">
          <div className="help-ask">
            <p className="t-body2 c-secondary">Can't find your answer? Ask Rafiki in your own words.</p>
            <Button type="accent" size="sm" onClick={() => window.dispatchEvent(new CustomEvent("rafiki:ask"))}>Ask Rafiki</Button>
          </div>
          <div className="help-pager">
            {prev ? <a className="help-link t-medium2" href={`#/help/${prev.id}`}><Icon name="chevron-left" size={16} />{prev.title}</a> : <span />}
            {next && <a className="help-link t-medium2" href={`#/help/${next.id}`}>{next.title}<Icon name="chevron-right" size={16} /></a>}
          </div>
        </footer>
      </article>

      <aside className="help-toc" aria-label="On this page">
        <p className="t-overline c-secondary">On this page</p>
        <ul>
          {page.s.map((s, i) => (
            <li key={s.h}>
              <a href={`#/help/${page.id}`} className={`help-toc__link t-body2 ${i === active ? "help-toc__link--active" : ""}`} aria-current={i === active ? "location" : undefined}
                onClick={(e) => { e.preventDefault(); jump(i); }}>{s.h}</a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export const openHelp = () => navigate("/help");
