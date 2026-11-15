/* Deva — DASVORA's scripted assistant (no AI API). Collects need, business and name, then hands off to WhatsApp. */
(() => {
  const WA_NUMBER = '919990585926';
  // Analytics: dataLayer events only, no personal data (no names or typed text).
  const track = (event, extra) => { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event }, extra)); } catch (_) {} };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('https://wa.me/')) track('whatsapp_click', { location: a.closest('.deva-panel') ? 'deva' : 'cta' });
    else if (href.startsWith('mailto:')) track('email_click');
  }, true);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MARK = '<svg viewBox="-14 -6 282 321" aria-hidden="true"><defs><linearGradient id="dvaU" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#d9dce1"/><stop offset=".8" stop-color="#6e737b"/><stop offset="1" stop-color="#2c2f34"/></linearGradient><linearGradient id="dvaL" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa0a8"/><stop offset=".35" stop-color="#eef0f3"/><stop offset=".7" stop-color="#c3c7cd"/><stop offset="1" stop-color="#8b9098"/></linearGradient><linearGradient id="dvaB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9cc7ff"/><stop offset=".35" stop-color="#2377F4"/><stop offset="1" stop-color="#0050b8"/></linearGradient></defs><path d="M7 0H131L254 126L188 176Z" fill="url(#dvaU)"/><path d="M188 176L254 126V219L161 309H62Z" fill="url(#dvaL)"/><path d="M0 66L99 164V192L0 290Z" fill="url(#dvaB)"/></svg>';
  const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';

  // Answers use only copy that already appears on the site.
  const FAQ = {
    what: "DASVORA AI builds intelligent customer systems and generative video.\n\nAI agents trained on your documents, product catalog, pricing rules and sales playbook answer, qualify and route enquiries from your website, WhatsApp and Instagram — around the clock.\n\nWe also create AI-directed brand films and ad content, without the overhead of a traditional shoot.",
    how: "It works in three steps:\n\n1. Capture — enquiries arrive from your website, WhatsApp and Instagram DMs, all in one place.\n2. Qualify — an agent trained on your catalog, pricing rules and sales playbook asks the right questions and scores intent.\n3. Hand off — qualified buyers go straight to your team’s calendar.\n\nAI qualifies. Human closes.",
  };
  const NEEDS = ['AI customer agent', 'Generative video & ads', 'Automation for my business', 'Something else'];
  const BUSINESSES = ['Retail / e-commerce', 'Real estate', 'Healthcare', 'Hospitality', 'Education', 'Other'];

  /* ---------- DOM ---------- */
  const fab = document.createElement('button');
  fab.className = 'deva-fab'; fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'deva-panel');
  fab.innerHTML = `<span class="deva-orb">${MARK}</span><span>Ask Deva</span>`;

  const panel = document.createElement('section');
  panel.className = 'deva-panel'; panel.id = 'deva-panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'deva-title');
  panel.setAttribute('data-lenis-prevent', ''); panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <header class="deva-head">
      <span class="deva-orb">${MARK}</span>
      <div class="deva-title"><b id="deva-title">Deva</b><span>DASVORA’s assistant</span></div>
      <button type="button" class="deva-x" aria-label="Close chat"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </header>
    <div class="deva-log" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="deva-chips" role="group" aria-label="Quick replies"></div>
    <form class="deva-form" autocomplete="off">
      <label class="deva-sr" for="deva-input">Message</label>
      <input id="deva-input" type="text" maxlength="80" enterkeyhint="send" placeholder="Pick an option above" disabled>
      <button type="submit" class="deva-send" aria-label="Send" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </form>`;
  document.body.append(fab, panel);

  const log = panel.querySelector('.deva-log'), chips = panel.querySelector('.deva-chips');
  const form = panel.querySelector('.deva-form'), input = panel.querySelector('#deva-input'), send = panel.querySelector('.deva-send');
  const closeBtn = panel.querySelector('.deva-x');

  /* ---------- conversation state ---------- */
  const data = { need: '', business: '', name: '' };
  let step = 'idle', started = false, busy = false, onText = null;
  const wait = (ms) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function add(text, who = 'bot') {
    const el = document.createElement('div'); el.className = `deva-msg ${who}`; el.textContent = text;
    log.appendChild(el); scrollDown(); return el;
  }
  async function say(text, delay) {
    busy = true;
    if (!reduce) {
      const t = document.createElement('div'); t.className = 'deva-typing'; t.setAttribute('aria-label', 'Deva is typing'); t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t); scrollDown();
      await wait(delay ?? Math.min(1500, 450 + text.length * 9));
      t.remove();
    }
    add(text, 'bot'); busy = false;
  }
  function setChips(list) {
    chips.innerHTML = '';
    list.forEach(([label, fn, ghost]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'deva-chip' + (ghost ? ' ghost' : ''); b.textContent = label;
      b.addEventListener('click', () => { if (busy) return; chips.innerHTML = ''; fn(label); });
      chips.appendChild(b);
    });
    requestAnimationFrame(scrollDown);
  }
  function askText(placeholder, handler) {
    onText = handler; input.disabled = false; send.disabled = false; input.placeholder = placeholder;
    // don't pop the iOS keyboard over the chips unless typing is the only way forward
    if (!chips.children.length) input.focus({ preventScroll: true });
  }
  function stopText() { onText = null; input.disabled = true; send.disabled = true; input.value = ''; input.placeholder = 'Pick an option above'; }

  form.addEventListener('submit', (e) => {
    e.preventDefault(); const v = input.value.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!v || !onText || busy) return; const h = onText; chips.innerHTML = ''; stopText(); add(v, 'me'); h(v);
  });

  /* ---------- flow ---------- */
  async function menu(first) {
    step = 'need';
    if (!first) await say('Anything else I can help with?');
    setChips([...NEEDS.map(n => [n, pickNeed]), ['What does DASVORA do?', () => faq('what'), true], ['How does it work?', () => faq('how'), true]]);
  }
  async function faq(key) {
    add(key === 'what' ? 'What does DASVORA do?' : 'How does it work?', 'me');
    await say(FAQ[key], 1100);
    await menu(false);
  }
  async function pickNeed(label) {
    add(label, 'me');
    if (label === 'Something else') {
      await say('Sure — tell me in a few words what you have in mind.');
      askText('What do you need?', (v) => { data.need = v; askBusiness(); });
      return;
    }
    data.need = label; askBusiness();
  }
  async function askBusiness() {
    step = 'business';
    await say('Great choice. What kind of business are you in? Pick one or type it.');
    setChips(BUSINESSES.map(b => [b, async (l) => {
      add(l, 'me'); stopText();
      if (l === 'Other') { await say('Got it — what’s the business?'); askText('Your business type', (v) => { data.business = v; askName(); }); }
      else { data.business = l; askName(); }
    }]));
    askText('Or type your business…', (v) => { data.business = v; askName(); });
  }
  async function askName() {
    step = 'name';
    await say('And what’s your name?');
    askText('Your name', (v) => { data.name = v; summary(); });
  }
  function waMessage() {
    return `Hi DASVORA, I'm ${data.name}.\nI'm interested in: ${data.need}\nMy business: ${data.business}\n(Sent via Deva on the DASVORA website)`;
  }
  function waLink() { return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage())}`; }
  async function summary() {
    step = 'summary';
    await say(`Thanks, ${data.name}! Here’s what I’ll pass on to the team:`);
    const card = document.createElement('div'); card.className = 'deva-summary';
    const dl = document.createElement('dl');
    [['Name', data.name], ['Looking for', data.need], ['Business', data.business]].forEach(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd);
    });
    const a = document.createElement('a'); a.className = 'deva-wa'; a.href = waLink(); a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `${WA_ICON}<span>Continue on WhatsApp</span>`;
    const note = document.createElement('p'); note.className = 'deva-note'; note.textContent = 'Opens WhatsApp with this message ready to send.';
    card.append(dl, a, note); log.appendChild(card); scrollDown();
    setChips([['Start over', restart, true], ['Email instead', () => { track('email_click'); location.href = 'mailto:devanshudeora077@gmail.com?subject=' + encodeURIComponent('DASVORA AI — Book a call') + '&body=' + encodeURIComponent(waMessage()); }, true]]);
    a.focus({ preventScroll: true }); requestAnimationFrame(scrollDown);
  }
  async function restart() {
    data.need = data.business = data.name = ''; stopText(); log.innerHTML = '';
    await say('Let’s start again. What can I help you with?', 500); menu(true);
  }
  async function start() {
    started = true;
    await say('Hi, I’m Deva, DASVORA’s assistant 👋', 700);
    await say('What can I help you with today?', 650);
    menu(true);
  }

  /* ---------- open / close, focus trap, Escape, iOS keyboard ---------- */
  let lastFocus = null;
  const phone = () => matchMedia('(max-width:640px)').matches;
  const vv = window.visualViewport;
  function fitViewport() {
    if (!vv) return;
    panel.style.setProperty('--deva-vh', vv.height + 'px');
    panel.style.setProperty('--deva-top', vv.offsetTop + 'px');
    if (document.activeElement === input) scrollDown();
  }
  if (vv) { vv.addEventListener('resize', fitViewport); vv.addEventListener('scroll', fitViewport); }

  function open() {
    if (document.documentElement.classList.contains('deva-open')) return;
    lastFocus = document.activeElement; fitViewport(); track('deva_open');
    document.documentElement.classList.add('deva-open'); if (phone()) document.documentElement.classList.add('deva-lock');
    fab.setAttribute('aria-expanded', 'true'); panel.setAttribute('aria-hidden', 'false');
    window.__lenis?.stop?.();
    setTimeout(() => (chips.querySelector('button') || closeBtn).focus({ preventScroll: true }), reduce ? 0 : 350);
    if (!started) start();
  }
  function close() {
    if (!document.documentElement.classList.contains('deva-open')) return;
    document.documentElement.classList.remove('deva-open', 'deva-lock');
    fab.setAttribute('aria-expanded', 'false'); panel.setAttribute('aria-hidden', 'true');
    window.__lenis?.start?.();
    (lastFocus && lastFocus.focus ? lastFocus : fab).focus({ preventScroll: true });
  }
  fab.addEventListener('click', open); closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (!document.documentElement.classList.contains('deva-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...panel.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')].filter(el => el.offsetParent !== null);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // any element with data-deva-open opens the assistant
  document.querySelectorAll('[data-deva-open]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); open(); }));
  window.Deva = { open, close, _waLink: waLink, _data: data };
})();
