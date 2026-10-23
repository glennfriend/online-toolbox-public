// 依 footprint 的 tabs 結構獨立維護, 切換只改顯示與焦點
export function createTabs(tablist, container, definitions, { initial, onSelect } = {}) {
  const entries = new Map();
  const ids = definitions.map(tab => tab.id);
  let current;
  function select(id, focus = false, notify = true) {
    if (!entries.has(id)) return;
    const changed = current !== id;
    current = id;
    for (const [name, { button, panel }] of entries) {
      const active = name === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
      if (active && focus) {
        button.focus({ preventScroll: true });
        button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    if (changed && notify) onSelect?.(id);
  }
  definitions.forEach(({ id, title, content, aside, indicator }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = aside ? 'tab tab-static' : 'tab';
    button.id = `netpath-tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `netpath-panel-${id}`);
    const label = document.createElement('span');
    label.textContent = title;
    button.append(label);
    let dot;
    if (indicator) {
      dot = document.createElement('span');
      dot.className = `tab-dot tab-${indicator}`;
      dot.setAttribute('aria-hidden', 'true');
      dot.hidden = true;
      button.append(dot);
    }
    button.addEventListener('click', () => select(id));
    button.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % ids.length, ArrowLeft: (index - 1 + ids.length) % ids.length, Home: 0, End: ids.length - 1 };
      if (!Object.hasOwn(next, event.key)) return;
      event.preventDefault();
      select(ids[next[event.key]], true);
    });
    const panel = document.createElement('section');
    panel.className = 'tab-panel';
    panel.id = `netpath-panel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    panel.append(content);
    entries.set(id, { button, panel, dot, title, indicator });
    tablist.append(button);
    container.append(panel);
  });
  select(entries.has(initial) ? initial : ids[0], false, false);
  return {
    select,
    active: () => current,
    panel: id => entries.get(id).panel,
    update(id, visible) {
      const { button, panel, dot, title, indicator } = entries.get(id);
      if (!dot) return;
      const status = indicator === 'error' ? '最近一輪有失敗' : '測速進行中';
      dot.hidden = !visible;
      dot.title = status;
      button.setAttribute('aria-label', `${title}${visible ? `, ${status}` : ''}`);
      if (indicator === 'busy') panel.setAttribute('aria-busy', String(visible));
    },
  };
}
