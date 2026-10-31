(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('phrase-data').textContent);
  const BY_ID = new Map(DATA.map((p) => [p.id, p]));
  const IDS = DATA.map((p) => p.id);
  const LOVE = IDS.filter((id) => BY_ID.get(id).family === 'love');
  const TEACH = IDS.filter((id) => BY_ID.get(id).family === 'teach');
  const SMILE = IDS.filter((id) => BY_ID.get(id).family === 'smile'); // index 0 = Sunday ... 6 = Saturday
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FAMILY = { love: 'The Words of Mother’s Love', teach: 'Teachings of Mother', smile: 'Each Day Smile' };
  const FREE = 'FREE';
  const KEY = 'mlpd-bingo';
  const CAMPAIGN_DAYS = 40;
  const campaignStart = () => new Date(2026, 10, 1); // Nov 1, 2026 (a Sunday)

  // ---------- lines ----------
  function makeLines(n) {
    const lines = [];
    const names = [];
    for (let r = 0; r < n; r++) { lines.push(Array.from({ length: n }, (_, c) => r * n + c)); names.push('Row ' + (r + 1)); }
    for (let c = 0; c < n; c++) { lines.push(Array.from({ length: n }, (_, r) => r * n + c)); names.push('Column ' + (c + 1)); }
    lines.push(Array.from({ length: n }, (_, i) => i * n + i)); names.push('The diagonal from the top left');
    lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i))); names.push('The diagonal from the top right');
    return { lines, names };
  }
  const L4 = makeLines(4);
  const L5 = makeLines(5);
  const complete = (marks, set) => set.lines.map((line, k) => (line.every((i) => marks[i]) ? k : -1)).filter((k) => k >= 0);
  function describe(done, set) {
    const parts = done.map((k, j) => { const n = set.names[k]; return j === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1); });
    const joined = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    return joined + (parts.length === 1 ? ' is complete.' : ' are complete.');
  }

  // ---------- random ----------
  function rand() {
    try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] / 4294967296; } catch (e) { return Math.random(); }
  }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---------- dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const campaignDay = (d) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - campaignStart()) / 86400000) + 1;
  function dayText(d) {
    const n = campaignDay(d);
    if (n < 1) return 'Starts Nov 1';
    if (n <= CAMPAIGN_DAYS) return 'Day ' + n + ' of 40';
    return 'After the 40 days';
  }
  const longDate = (d) => DOW_LONG[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();

  // ---------- dealing ----------
  // Daily card: all 9 Words of Mother's Love, today's Smile, and 6 of the 13 teachings.
  const dealPractice = (date) => shuffle(LOVE.concat([SMILE[date.getDay()]], shuffle(TEACH).slice(0, 6)));
  function dealGame() { const ids = shuffle(IDS).slice(0, 24); ids.splice(12, 0, FREE); return ids; }
  const gameMarks = () => Array.from({ length: 25 }, (_, i) => i === 12);

  // ---------- state ----------
  let S = null;
  function blank(now) {
    return {
      v: 1,
      full: false,
      practice: { date: dayKey(now), card: dealPractice(now), marks: Array(16).fill(false) },
      history: {},
      game: { card: dealGame(), marks: gameMarks(), calls: [] }
    };
  }
  const isMarks = (m, n) => Array.isArray(m) && m.length === n && m.every((x) => typeof x === 'boolean');
  function isCard(card, n, withFree) {
    if (!Array.isArray(card) || card.length !== n || new Set(card).size !== n) return false;
    return card.every((id, i) => (withFree && i === 12 ? id === FREE : BY_ID.has(id)));
  }
  function sanitize(s, now) {
    const out = blank(now);
    if (!s || typeof s !== 'object') return out;
    if (typeof s.full === 'boolean') out.full = s.full;
    if (s.history && typeof s.history === 'object') {
      Object.keys(s.history).forEach((k) => {
        const h = s.history[k];
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && h && Number.isInteger(h.marked) && typeof h.bingo === 'boolean') out.history[k] = { marked: h.marked, bingo: h.bingo };
      });
    }
    const p = s.practice;
    if (p && typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && isCard(p.card, 16, false) && isMarks(p.marks, 16)) {
      out.practice = { date: p.date, card: p.card.slice(), marks: p.marks.slice() };
    }
    const g = s.game;
    if (g && isCard(g.card, 25, true) && isMarks(g.marks, 25) && Array.isArray(g.calls) && new Set(g.calls).size === g.calls.length && g.calls.every((id) => BY_ID.has(id))) {
      out.game = { card: g.card.slice(), marks: g.marks.slice(), calls: g.calls.slice() };
      out.game.marks[12] = true;
    }
    return out;
  }
  function load() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  let saveOk = true;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; /* the game still works for this visit */ }
    paintSaved();
  }
  function paintSaved() {
    ['pSaved', 'gSaved'].forEach((id) => {
      const p = document.getElementById(id);
      if (!p) return;
      p.classList.toggle('off', !saveOk);
      p.firstChild.textContent = saveOk ? '✓' : '!';
      p.lastChild.textContent = saveOk
        ? 'Saved automatically on this phone'
        : 'This browser isn’t saving your progress. Open the link in Safari or Chrome, not a private window.';
    });
  }

  // ---------- elements ----------
  const $ = (id) => document.getElementById(id);
  const el = {};
  ['page', 'tabPractice', 'tabGame', 'practiceView', 'gameView', 'callerView',
    'pGrid', 'pDate', 'pDay', 'pNote', 'pBingo', 'pBingoLine', 'pFull', 'pCount', 'calGrid', 'calSummary',
    'gGrid', 'gNote', 'gBingo', 'gBingoLine', 'gBingoList', 'gFull', 'newCard', 'confirmNew', 'confirmNewYes', 'confirmNewNo', 'playAgain',
    'callNext', 'callNext2', 'callCount', 'callerCount', 'lastCalled', 'lastFamily', 'stageText', 'stageFamily',
    'undoCall', 'startOver', 'confirmReset', 'confirmResetText', 'confirmResetYes', 'confirmResetNo',
    'flashLove', 'flashTeach', 'flashSmile'].forEach((id) => { el[id] = $(id); });

  // ---------- hyphen points for long words, so narrow squares break words cleanly on every phone ----------
  const HY = new Map(('Mag-nifi-cent-ly dis-ap-point-ed ex-pec-ta-tions Ter-rifi-cal-ly beau-ti-ful-ly com-plain-ing com-pli-ments ' +
    'Won-der-ful-ly com-pli-ment Every-thing faith-ful-ly Splen-did-ly suf-fer-ings un-der-stand ar-ro-gance Ar-ro-gance ' +
    'beau-ti-ful bless-ings com-plaint dis-ap-pear Fer-vent-ly grat-i-tude re-ceiv-ing Sac-ri-fice Wednes-day Al-though ' +
    'any-thing be-com-ing broth-ers hu-mil-i-ty pu-ri-fies re-ceived re-ceives Sat-ur-day Ten-der-ly Thurs-day Abra-ham ' +
    'amaz-ing an-oth-er em-brace feel-ing great-er King-dom mind-set per-fect pres-ent pro-cess re-ceive sis-ters ' +
    'small-er Sweet-ly Tues-day want-ing Who-ev-er with-out yield-ed')
    .split(' ').map((w) => [w.replace(/-/g, ''), w.replace(/-/g, '\u00AD')]));
  const hyph = (s) => s.replace(/[A-Za-z]+/g, (w) => HY.get(w) || w);

  // ---------- shared card rendering ----------
  function buildGrid(container, ids, onToggle) {
    container.textContent = '';
    return ids.map((id, i) => {
      if (id === FREE) {
        const d = document.createElement('div');
        d.className = 'cell free marked';
        d.dataset.id = FREE;
        d.innerHTML = '<span class="txt"><span class="free-word">Free</span></span>';
        container.appendChild(d);
        return d;
      }
      const p = BY_ID.get(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell ' + p.family + (p.family === 'smile' ? ' d-' + DOW[SMILE.indexOf(id)] : '');
      b.dataset.id = id;
      b.title = p.text;
      const t = document.createElement('span');
      t.className = 'txt';
      if (p.family === 'smile') { const dot = document.createElement('span'); dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true'); t.appendChild(dot); }
      t.appendChild(document.createTextNode(hyph(p.text)));
      b.appendChild(t);
      b.addEventListener('click', () => onToggle(i));
      container.appendChild(b);
      return b;
    });
  }
  function paintGrid(cells, marks, set, called) {
    const done = complete(marks, set);
    const win = new Set(done.flatMap((k) => set.lines[k]));
    cells.forEach((c, i) => {
      const m = marks[i];
      c.classList.toggle('marked', m);
      if (c.tagName === 'BUTTON') c.setAttribute('aria-pressed', m ? 'true' : 'false');
      c.classList.toggle('called', !!called && !m && called.has(c.dataset.id));
      c.classList.toggle('win', win.has(i));
    });
    return done;
  }
  function celebrate(box, cells, done, set) {
    box.classList.remove('stamp');
    void box.offsetWidth;
    box.classList.add('stamp');
    const idx = new Set(done.flatMap((k) => set.lines[k]));
    cells.forEach((c, i) => {
      if (!idx.has(i)) return;
      c.classList.remove('shine');
      void c.offsetWidth;
      c.classList.add('shine');
    });
  }

  // ---------- daily practice ----------
  let pCells = [];
  let pShown = 0;
  function buildPractice() {
    pCells = buildGrid(el.pGrid, S.practice.card, togglePractice);
    pShown = complete(S.practice.marks, L4).length;
  }
  function recordToday() {
    const marked = S.practice.marks.filter(Boolean).length;
    const bingo = complete(S.practice.marks, L4).length > 0;
    if (marked === 0 && !S.history[S.practice.date]) return;
    S.history[S.practice.date] = { marked, bingo };
  }
  function togglePractice(i) {
    S.practice.marks[i] = !S.practice.marks[i];
    recordToday();
    save();
    const p = BY_ID.get(S.practice.card[i]);
    el.pNote.textContent = (S.practice.marks[i] ? 'Practiced: ' : 'Unmarked: ') + p.text;
    paintPractice(true);
  }
  function paintPractice(announce) {
    const done = paintGrid(pCells, S.practice.marks, L4, null);
    el.pGrid.classList.toggle('full', S.full);
    el.pFull.checked = S.full;
    const d = fromKey(S.practice.date);
    el.pDate.textContent = longDate(d);
    el.pDay.textContent = dayText(d);
    const marked = S.practice.marks.filter(Boolean).length;
    el.pCount.textContent = marked + ' of 16 practiced today';
    if (done.length) {
      el.pBingo.hidden = false;
      el.pBingoLine.textContent = describe(done, L4);
      if (announce && done.length > pShown) celebrate(el.pBingo, pCells, done, L4);
    } else {
      el.pBingo.hidden = true;
    }
    pShown = done.length;
    paintCalendar();
  }
  function rollPractice(now) {
    const today = dayKey(now);
    if (S.practice.date === today) return false;
    S.practice = { date: today, card: dealPractice(now), marks: Array(16).fill(false) };
    return true;
  }

  // ---------- 40-day calendar ----------
  let calCells = [];
  function buildCalendar() {
    el.calGrid.textContent = '';
    DOW_SHORT.forEach((name, i) => {
      const h = document.createElement('div');
      h.className = 'cal-dow d-' + DOW[i];
      h.style.setProperty('--dot', 'var(--' + DOW[i] + ')');
      h.textContent = name;
      h.title = BY_ID.get(SMILE[i]).text;
      el.calGrid.appendChild(h);
    });
    calCells = [];
    for (let i = 0; i < CAMPAIGN_DAYS; i++) {
      const d = new Date(2026, 10, 1 + i);
      const c = document.createElement('div');
      c.className = 'cal-day';
      c.dataset.key = dayKey(d);
      if (i === 0) c.style.gridColumnStart = String(d.getDay() + 1);
      if (d.getDate() === 1) { const m = document.createElement('span'); m.className = 'mon'; m.textContent = MONTHS[d.getMonth()]; c.appendChild(m); }
      c.appendChild(document.createTextNode(String(d.getDate())));
      el.calGrid.appendChild(c);
      calCells.push(c);
    }
  }
  function paintCalendar() {
    const today = dayKey(new Date());
    let practiced = 0;
    let bingos = 0;
    calCells.forEach((c) => {
      const k = c.dataset.key;
      const h = S.history[k];
      const did = !!(h && h.marked > 0);
      const won = !!(h && h.bingo);
      if (did) practiced++;
      if (won) bingos++;
      c.classList.toggle('bingo', won);
      c.classList.toggle('done', did && !won);
      c.classList.toggle('today', k === today);
      c.classList.toggle('future', k > today);
      const d = fromKey(k);
      c.setAttribute('aria-label', MONTHS[d.getMonth()] + ' ' + d.getDate() + ': ' + (won ? 'BINGO' : did ? h.marked + ' practiced' : k > today ? 'coming up' : 'no practice marked'));
    });
    el.calSummary.textContent = practiced + ' of 40 days practiced · ' + bingos + ' BINGO day' + (bingos === 1 ? '' : 's');
  }

  // ---------- game card ----------
  let gCells = [];
  let gShown = 0;
  function buildGame() {
    gCells = buildGrid(el.gGrid, S.game.card, toggleGame);
    gShown = complete(S.game.marks, L5).length;
  }
  function toggleGame(i) {
    if (i === 12) return;
    S.game.marks[i] = !S.game.marks[i];
    save();
    const p = BY_ID.get(S.game.card[i]);
    el.gNote.textContent = (S.game.marks[i] ? 'Marked: ' : 'Unmarked: ') + p.text;
    paintGame(true);
  }
  function paintGame(announce) {
    const called = new Set(S.game.calls);
    const done = paintGrid(gCells, S.game.marks, L5, called);
    el.gGrid.classList.toggle('full', S.full);
    el.gFull.checked = S.full;
    if (done.length) {
      el.gBingo.hidden = false;
      el.gBingoLine.textContent = describe(done, L5);
      const idx = [...new Set(done.flatMap((k) => L5.lines[k]))].sort((a, b) => a - b).filter((i) => i !== 12);
      el.gBingoList.textContent = '';
      idx.forEach((i) => { const li = document.createElement('li'); li.textContent = BY_ID.get(S.game.card[i]).text; el.gBingoList.appendChild(li); });
      if (announce && done.length > gShown) celebrate(el.gBingo, gCells, done, L5);
    } else {
      el.gBingo.hidden = true;
    }
    gShown = done.length;
  }
  function dealNewGame(clearCalls) {
    S.game = { card: dealGame(), marks: gameMarks(), calls: clearCalls ? [] : S.game.calls };
    save();
    buildGame();
    paintGame(false);
    paintCalls();
    el.gNote.textContent = 'New card dealt. Tap a square to mark it.';
  }

  // ---------- caller ----------
  const flashItems = new Map();
  function familyLine(p) {
    if (p.family === 'love') return FAMILY.love + ' · ' + p.label;
    if (p.family === 'smile') return FAMILY.smile + ' · ' + p.label;
    return FAMILY.teach;
  }
  function buildFlash() {
    const todayIdx = new Date().getDay();
    DATA.forEach((p) => {
      const li = document.createElement('li');
      if (p.family === 'love' || p.family === 'smile') {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = p.label;
        if (p.family === 'smile' && SMILE.indexOf(p.id) === todayIdx) { const t = document.createElement('span'); t.className = 'today'; t.textContent = '· Today'; tag.appendChild(t); }
        li.appendChild(tag);
      }
      li.appendChild(document.createTextNode(p.text));
      const st = document.createElement('span');
      st.className = 'sr';
      li.appendChild(st);
      const list = p.family === 'love' ? el.flashLove : p.family === 'teach' ? el.flashTeach : el.flashSmile;
      list.appendChild(li);
      flashItems.set(p.id, li);
    });
  }
  function paintCalls() {
    const n = S.game.calls.length;
    const total = IDS.length;
    const countText = n + ' of ' + total + ' called';
    el.callCount.textContent = countText;
    el.callerCount.textContent = countText;
    const allDone = n >= total;
    [el.callNext, el.callNext2].forEach((b) => { b.disabled = allDone; b.textContent = allDone ? 'All called' : 'Call next'; });
    el.undoCall.disabled = n === 0;
    el.startOver.disabled = n === 0;
    if (n === 0) {
      el.lastCalled.textContent = 'Nothing called yet.';
      el.lastCalled.classList.add('empty');
      el.lastFamily.textContent = '';
      el.stageFamily.textContent = 'Ready';
      el.stageText.textContent = 'Tap Call next to draw the first phrase.';
      el.stageText.classList.add('empty');
    } else {
      const p = BY_ID.get(S.game.calls[n - 1]);
      el.lastCalled.textContent = p.text;
      el.lastCalled.classList.remove('empty');
      el.lastFamily.textContent = familyLine(p);
      el.stageFamily.textContent = familyLine(p);
      el.stageText.textContent = p.text;
      el.stageText.classList.remove('empty');
    }
    const called = new Set(S.game.calls);
    const latest = n ? S.game.calls[n - 1] : null;
    flashItems.forEach((li, id) => {
      li.classList.toggle('is-called', called.has(id));
      li.classList.toggle('is-latest', id === latest);
      li.lastChild.textContent = called.has(id) ? ' (called)' : '';
    });
  }
  let wake = null;
  async function keepAwake() {
    try {
      if (!wake && navigator.wakeLock && document.visibilityState === 'visible') {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      }
    } catch (e) { wake = null; }
  }
  function callNext() {
    const remaining = IDS.filter((id) => !S.game.calls.includes(id));
    if (!remaining.length) return;
    S.game.calls.push(remaining[Math.floor(rand() * remaining.length)]);
    save();
    paintCalls();
    paintGame(false);
    keepAwake();
  }
  function undoCall() {
    if (!S.game.calls.length) return;
    S.game.calls.pop();
    save();
    paintCalls();
    paintGame(false);
  }

  // ---------- routing ----------
  function route() {
    const h = location.hash;
    const view = h === '#game' ? 'game' : h === '#caller' ? 'caller' : 'practice';
    el.practiceView.hidden = view !== 'practice';
    el.gameView.hidden = view !== 'game';
    el.callerView.hidden = view !== 'caller';
    el.page.classList.toggle('wide', view === 'caller');
    el.tabPractice.setAttribute('aria-current', view === 'practice' ? 'page' : 'false');
    el.tabGame.setAttribute('aria-current', view === 'practice' ? 'false' : 'page');
  }

  // ---------- day change while open ----------
  function tick() {
    if (!S) return;
    if (rollPractice(new Date())) { save(); buildPractice(); el.pNote.textContent = 'A new day, a new card. Tap a square after you practice it.'; }
    paintPractice(false);
  }

  // ---------- events ----------
  function bind() {
    window.addEventListener('hashchange', route);
    el.pFull.addEventListener('change', () => { S.full = el.pFull.checked; save(); paintPractice(false); paintGame(false); });
    el.gFull.addEventListener('change', () => { S.full = el.gFull.checked; save(); paintPractice(false); paintGame(false); });
    el.callNext.addEventListener('click', callNext);
    el.callNext2.addEventListener('click', callNext);
    el.undoCall.addEventListener('click', undoCall);
    el.newCard.addEventListener('click', () => {
      if (S.game.marks.some((m, i) => m && i !== 12)) { el.confirmNew.hidden = false; el.confirmNewYes.focus(); } else { dealNewGame(false); }
    });
    el.confirmNewYes.addEventListener('click', () => { el.confirmNew.hidden = true; dealNewGame(false); });
    el.confirmNewNo.addEventListener('click', () => { el.confirmNew.hidden = true; el.newCard.focus(); });
    el.playAgain.addEventListener('click', () => dealNewGame(true));
    el.startOver.addEventListener('click', () => {
      const n = S.game.calls.length;
      if (!n) return;
      el.confirmResetText.textContent = 'Clear all ' + n + ' call' + (n === 1 ? '' : 's') + ' and start a new round?';
      el.confirmReset.hidden = false;
      el.confirmResetYes.focus();
    });
    el.confirmResetYes.addEventListener('click', () => { S.game.calls = []; save(); el.confirmReset.hidden = true; paintCalls(); paintGame(false); });
    el.confirmResetNo.addEventListener('click', () => { el.confirmReset.hidden = true; el.startOver.focus(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      tick();
      if (location.hash === '#caller' && S.game.calls.length) keepAwake();
    });
    setInterval(tick, 60000);
  }

  // ---------- start ----------
  let bound = false;
  function start(data) {
    const now = new Date();
    S = sanitize((data && data.state) || load(), now);
    rollPractice(now);
    if (!bound) { bind(); buildFlash(); buildCalendar(); bound = true; }
    buildPractice();
    buildGame();
    paintPractice(false);
    paintGame(false);
    paintCalls();
    route();
    save();
  }
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') { try { hot.snapshot(() => ({ state: S })); } catch (e) { /* optional */ } }
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
})();
