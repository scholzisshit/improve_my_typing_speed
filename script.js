/* script.js — KEYSKILL main logic */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const state = {
    duration: 60,
    remaining: 60,
    started: false,
    text: "",
    lang: "english",
    typedChars: 0,
    correctChars: 0,
    errors: 0,
    timerId: null
  };

  // Helper: compute WPM and accuracy
  function computeStats(elapsedSeconds) {
    const minutes = Math.max(elapsedSeconds, 1) / 60;
    const wpm = Math.round((state.correctChars / 5) / minutes);
    const accuracy = state.typedChars > 0 ?
      Math.round((state.correctChars / state.typedChars) * 100) : 100;
    return { wpm, accuracy };
  }

  // Save test result to localStorage
  function saveResult(result) {
    let history = JSON.parse(localStorage.getItem("typingHistory") || "[]");
    history.push(result);
    localStorage.setItem("typingHistory", JSON.stringify(history));
  }

  // Pick random text
  function pickText() {
    const pool = state.lang === "hindi" ? (window.hindiTexts || []) : (window.englishTexts || []);
    state.text = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "No text available.";
    renderPassage($("#text-display"), state.text, 0);
  }

  // Render passage
  function renderPassage(target, text, cursorIndex = 0) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.textContent = text[i];
      span.className = "char";
      if (i === cursorIndex) span.classList.add("current");
      frag.appendChild(span);
    }
    target.replaceChildren(frag);
  }

  // Test page init
  function initTestPage() {
    const textDisplay = $("#text-display");
    const textInput = $("#text-input");
    const wpmEl = $("#wpm");
    const accEl = $("#accuracy");
    const errEl = $("#errors");
    const timerEl = $("#timer");
    const btnReset = $("#btnReset");
    const langSel = $("#language");
    const durSel = $("#duration");

    function reset() {
      state.lang = langSel.value;
      state.duration = parseInt(durSel.value, 10) || 60;
      // persist settings
      try { localStorage.setItem('typing_last_lang', state.lang); localStorage.setItem('typing_last_duration', state.duration); } catch (e) {}
      state.remaining = state.duration;
      state.started = false;
      state.typedChars = 0;
      state.correctChars = 0;
      state.errors = 0;
      clearInterval(state.timerId);

      textInput.value = "";
      // Allow typing even before pressing Start so typing can auto-start the test
      textInput.disabled = false;
  wpmEl.textContent = "0";
      accEl.textContent = "100%";
      errEl.textContent = "0";
      timerEl.textContent = state.duration;

  btnReset.disabled = true;
    // btnStart removed from UI

  // Show start hint if present
  const hint = $("#start-hint");
  if (hint) hint.style.display = "block";

      pickText();
    }

    // btnStart removed; tests now auto-start when the user begins typing

    // Auto-start when the user begins typing (preserve any typed input)
    function autoStart() {
      if (state.started) return;
      state.started = true;
      // Ensure input enabled and focused
      textInput.disabled = false;
      textInput.focus();
      btnReset.disabled = false;

      const t0 = Date.now();
      state.timerId = setInterval(() => {
        state.remaining = Math.max(state.duration - Math.floor((Date.now() - t0) / 1000), 0);
        timerEl.textContent = state.remaining;

        const elapsed = state.duration - state.remaining;
        const { wpm, accuracy } = computeStats(elapsed);
        wpmEl.textContent = wpm;
        accEl.textContent = `${accuracy}%`;
        errEl.textContent = state.errors;

        if (state.remaining <= 0) end();
      }, 200);
      // Hide start hint when auto-starting
      const hint = $("#start-hint");
      if (hint) hint.style.display = "none";
      // remove invite pulse
      textInput.classList.remove('invite-pulse');
    }

    // load persisted settings (if any)
    try {
      const lastLang = localStorage.getItem('typing_last_lang');
      const lastDur = parseInt(localStorage.getItem('typing_last_duration'),10);
      if (lastLang) langSel.value = lastLang;
      if (lastDur) durSel.value = String(lastDur);
    } catch (e) {}

    // When the user changes language or duration, persist and reload to reinitialize the test
    if (langSel) {
      langSel.addEventListener('change', () => {
        try { localStorage.setItem('typing_last_lang', langSel.value); } catch (e) {}
        // reload immediately to apply the new language
        location.reload();
      });
    }
    if (durSel) {
      durSel.addEventListener('change', () => {
        try { localStorage.setItem('typing_last_duration', parseInt(durSel.value,10)); } catch (e) {}
        // reload immediately to apply the new duration
        location.reload();
      });
    }

    function end() {
      clearInterval(state.timerId);
      state.started = false;
      textInput.disabled = true;
      btnReset.disabled = false;

      // Save result on test end
      const result = {
        date: new Date().toLocaleString(),
        language: state.lang,
        duration: state.duration,
        wpm: state.correctChars ? Math.round(state.correctChars / 5 / (state.duration / 60)) : 0,
        accuracy: state.typedChars ? Math.round(state.correctChars / state.typedChars * 100) : 100,
        errors: state.errors,
      };
      saveResult(result);
      // Populate and show result overlay
      const overlay = $("#result-overlay");
      if (overlay) {
        $("#res-wpm").textContent = result.wpm;
        // characters per minute (CPM) - use correctChars as the typed correct characters
        const cpm = state.correctChars ? Math.round(state.correctChars / state.duration * 60) : 0;
        $("#res-cpm").textContent = cpm;
        // keys per second (KPS)
        const kps = state.typedChars ? (state.typedChars / state.duration) : 0;
        $("#res-kps").textContent = kps.toFixed(2);
        $("#res-acc").textContent = `${result.accuracy}%`;
        $("#res-err").textContent = result.errors;
  // populate PB history list for current lang/duration
  try { if (typeof populatePbHistory === 'function') populatePbHistory(); } catch(e){}

  // show overlay using CSS class
  overlay.style.display = 'flex';
  overlay.classList.add('show');

        // Check personal best per language+duration
        try {
          const key = `pb_${state.lang}_${state.duration}`;
          const prev = parseInt(localStorage.getItem(key), 10) || 0;
          if (result.wpm > prev) {
            // New PB: store and celebrate
            localStorage.setItem(key, String(result.wpm));
            const badge = $("#pb-badge"); if (badge) badge.style.display = 'block';
            // smooth confetti via canvas
            try { runConfetti(overlay); } catch (e) { console.warn('Confetti failed', e); }
          } else {
            const badge = $("#pb-badge"); if (badge) badge.style.display = 'none';
          }
        } catch (e) { /* ignore storage errors */ }
      }
    }

    // Clear saved PBs and settings
    const btnClear = $("#btnClearData");
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (!confirm('Clear saved personal bests and settings?')) return;
        try {
          // remove keys that start with pb_ or typing_last_
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('pb_') || k.startsWith('typing_last_')) localStorage.removeItem(k);
          });
          alert('Cleared saved data.');
        } catch (e) { alert('Unable to clear storage (browser restricted).'); }
      });
    }

    // Populate PB history for the current lang+duration
    function populatePbHistory() {
      const list = $('#pb-list');
      if (!list) return;
      list.innerHTML = '';
      try {
        const keyPrefix = `history_${state.lang}_${state.duration}`;
        const history = JSON.parse(localStorage.getItem('typingHistory') || '[]')
          .filter(it => it.language === state.lang && it.duration === state.duration)
          .sort((a,b) => b.wpm - a.wpm)
          .slice(0,3);
        if (history.length === 0) {
          const li = document.createElement('li'); li.textContent = 'No previous runs'; list.appendChild(li); return;
        }
        history.forEach(it => { const li = document.createElement('li'); li.textContent = `${it.wpm} WPM — ${it.date}`; list.appendChild(li); });
      } catch (e) {
        const li = document.createElement('li'); li.textContent = 'Error reading history'; list.appendChild(li);
      }
    }

    // Confetti implementation (minimal canvas-based)
    function runConfetti(container) {
      // create canvas overlay
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed'; canvas.style.left = 0; canvas.style.top = 0; canvas.style.pointerEvents = 'none';
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      container.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const pieces = [];
      const colors = ['#f43f5e','#fb923c','#f59e0b','#10b981','#06b6d4','#6366f1'];
      for (let i=0;i<60;i++) pieces.push({ x: Math.random()*canvas.width, y: -20 - Math.random()*200, vx: (Math.random()-0.5)*6, vy: 2+Math.random()*4, r: 6+Math.random()*6, c: colors[Math.floor(Math.random()*colors.length)], rot: Math.random()*360 });
      let t0 = null;
      function frame(ts) {
        if (!t0) t0 = ts; const dt = ts - t0; t0 = ts;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for (const p of pieces) {
          p.x += p.vx * (dt/16);
          p.y += p.vy * (dt/16);
          p.vy += 0.06 * (dt/16);
          ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot * Math.PI/180);
          ctx.fillStyle = p.c; ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.4);
          ctx.restore();
        }
        // remove when below screen
        if (pieces.every(p=>p.y>canvas.height+50)) { canvas.remove(); return; }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    textInput.addEventListener("input", () => {
      // If the test hasn't started yet, start it automatically when the user types
      if (!state.started) autoStart();
      const input = textInput.value;
      state.typedChars = input.length;
      state.correctChars = 0;
      state.errors = 0;

      const chars = textDisplay.querySelectorAll(".char");
      const compareLen = Math.min(input.length, state.text.length);

      for (let i = 0; i < state.text.length; i++) {
        const span = chars[i];
        if (!span) break;
        span.classList.remove("correct", "incorrect", "current");
        if (i < compareLen) {
          if (input[i] === state.text[i]) {
            span.classList.add("correct");
            state.correctChars++;
          } else {
            span.classList.add("incorrect");
            state.errors++;
          }
        }
      }

      const cursorIndex = Math.min(input.length, state.text.length - 1);
      if (chars[cursorIndex]) chars[cursorIndex].classList.add("current");

      if (input.length >= state.text.length) end();
    });

    btnReset.addEventListener("click", reset);

    // New Test button handler
    const btnNewTest = $("#btnNewTest");
    if (btnNewTest) {
      btnNewTest.addEventListener("click", () => {
        reset();
      });
    }

    // Result overlay buttons
    const resClose = $("#res-close");
    const resNew = $("#res-new");
    const overlay = $("#result-overlay");
    if (resClose && overlay) {
      resClose.addEventListener('click', () => { overlay.style.display = 'none'; });
    }
    if (resNew) {
      resNew.addEventListener('click', () => { overlay.style.display = 'none'; reset(); });
    }

    // Keyboard shortcuts: Alt+1..Alt+4 for quick durations
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { durSel.value = '15'; reset(); }
        if (e.key === '2') { durSel.value = '30'; reset(); }
        if (e.key === '3') { durSel.value = '60'; reset(); }
        if (e.key === '4') { durSel.value = '120'; reset(); }
      }
    });

    // Keyboard shortcut: Ctrl+Shift+R to reset the test
    // Also accept Meta+Shift+R (Cmd+Shift+R) on macOS as a friendly alternative
    document.addEventListener('keydown', (e) => {
      const isR = (e.key === 'R' || e.key === 'r');
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && e.shiftKey && isR) {
        e.preventDefault();
        reset();
      }
    });

    reset();
  }

  // New function to render progress chart using Chart.js
  function renderProgressChart() {
    const history = JSON.parse(localStorage.getItem("typingHistory")) || [];
    if (history.length === 0) return;

    const dates = history.map(item => item.date);
    const wpmData = history.map(item => item.wpm);

    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'WPM',
          data: wpmData,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Typing Progress Over Time'
          }
        }
      }
    });
  }

  // Router
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#text-display")) initTestPage();
    renderProgressChart(); // call chart render on DOM load
  });
})();
