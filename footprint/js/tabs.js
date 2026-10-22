// 分組顯示與鍵盤操作獨立於檢測排程, 切換分頁不會呼叫任何檢測
export function createTabs(tablist, container, groups) {
  const entries = new Map();
  function select(group, focus = false) {
    for (const [name, { button, panel }] of entries) {
      const active = name === group;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
      if (active && focus) {
        button.focus({ preventScroll: true });
        button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }
  groups.forEach((group, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.id = `check-tab-${index}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `check-panel-${index}`);
    const label = document.createElement('span');
    label.textContent = group;
    const count = document.createElement('span');
    count.className = 'badge exposed tab-count';
    count.setAttribute('aria-hidden', 'true');
    count.hidden = true;
    const indicator = document.createElement('span');
    indicator.className = 'tab-busy';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.title = '檢測中';
    indicator.hidden = true;
    button.append(label, count, indicator);
    button.addEventListener('click', () => select(group));
    button.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % groups.length, ArrowLeft: (index - 1 + groups.length) % groups.length, Home: 0, End: groups.length - 1 };
      if (!Object.hasOwn(next, event.key)) return;
      event.preventDefault();
      select(groups[next[event.key]], true);
    });
    const panel = document.createElement('section');
    panel.className = 'tab-panel';
    panel.id = `check-panel-${index}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    entries.set(group, { button, panel, count, indicator });
    tablist.append(button);
    container.append(panel);
  });
  select(groups[0]);
  return {
    select,
    panel: group => entries.get(group).panel,
    update(group, exposed, busy) {
      const { button, panel, count, indicator } = entries.get(group);
      count.textContent = exposed;
      count.title = `會外洩 ${exposed} 項`;
      count.hidden = exposed === 0;
      indicator.hidden = !busy;
      panel.setAttribute('aria-busy', String(busy));
      button.setAttribute('aria-label', `${group}${exposed ? `, 會外洩 ${exposed} 項` : ''}${busy ? ', 檢測中' : ''}`);
    },
  };
}
