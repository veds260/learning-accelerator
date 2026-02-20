// Lessons Page Logic

let lessonsData = [];
let userProgress = { completedLessons: [], xp: 0, streak: 0 };

const STORAGE_KEY = 'learning-accelerator-progress';

const BADGES = {
  'tokenization':       { emoji: '🧩', name: 'Word Breaker' },
  'special-tokens':     { emoji: '🎯', name: 'Token Master' },
  'byte-pair-encoding': { emoji: '🔀', name: 'Merge Wizard' },
  'data-sampling':      { emoji: '📊', name: 'Data Sampler' },
  'embeddings':         { emoji: '🗺️', name: 'Vector Nav' }
};

// ── Storage ───────────────────────────────────────────────────────────────────
function loadLocalProgress() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { completedLessons: [], xp: 0, streak: 0, lastActive: null };
  } catch {
    return { completedLessons: [], xp: 0, streak: 0, lastActive: null };
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadLessonsData();
    userProgress = loadLocalProgress();
    renderAll();
    setupReveal();
    setupToggle();
  } catch (err) {
    console.error('Init failed:', err);
    showError(err.message);
  }
});

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── Load lessons ──────────────────────────────────────────────────────────────
async function loadLessonsData(all = false) {
  const url = all ? '/api/lessons' : '/api/lessons?limit=10';
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  lessonsData = Array.isArray(data) ? data : (data.lessons || []);
  if (!lessonsData.length) throw new Error('No lessons found');
}

// ── Render everything ────────────────────────────────────────────────────────
function renderAll() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('lessons-content').style.display = 'block';

  const completed = userProgress.completedLessons || [];
  const xp        = userProgress.xp || 0;
  const streak    = userProgress.streak || 0;

  // Stats bar
  if (completed.length > 0) {
    const statsBar = document.getElementById('stats-bar');
    if (statsBar) statsBar.style.display = 'block';

    const totalXP = lessonsData.length * 100;
    const pct     = Math.min((xp / Math.max(totalXP, 1)) * 100, 100);
    const level   = Math.min(Math.floor(xp / 100) + 1, 20);

    const levelEl = document.getElementById('level-badge');
    if (levelEl) levelEl.textContent = `Lv ${level}`;

    const xpCur = document.getElementById('xp-current');
    if (xpCur) xpCur.textContent = xp;

    const xpTot = document.getElementById('xp-total');
    if (xpTot) xpTot.textContent = totalXP;

    setTimeout(() => {
      const fill = document.getElementById('xp-bar-fill');
      if (fill) fill.style.width = `${pct}%`;
    }, 200);

    if (streak > 0) {
      const streakPill = document.getElementById('streak-pill');
      if (streakPill) {
        streakPill.style.display = 'flex';
        const sc = document.getElementById('streak-count');
        if (sc) sc.textContent = streak;
      }
    }
  }

  renderNextCard();
  renderCompleted();
  renderLessonPath();
  renderAchievements();
}

// ── Next lesson card ──────────────────────────────────────────────────────────
function renderNextCard() {
  const container = document.getElementById('next-lesson-card');
  if (!container) return;

  const completed = userProgress.completedLessons || [];
  const next = lessonsData.find(l => !completed.includes(l.id));

  if (!next) {
    container.innerHTML = `
      <div class="next-card-inner next-card-done">
        <span class="done-icon">🎉</span>
        <h3>All lessons complete!</h3>
        <p>You've mastered the foundation. Time to build.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="next-card-inner">
      <div class="next-card-label">Up Next</div>
      <span class="next-card-emoji">${next.emoji || '📖'}</span>
      <div class="next-card-title">${next.title}</div>
      <div class="next-card-sub">${next.subtitle || ''}</div>
      <button class="btn-start" onclick="goToLesson('${next.id}')">
        Start Lesson →
      </button>
    </div>`;
}

// ── Completed list ────────────────────────────────────────────────────────────
function renderCompleted() {
  const completed = userProgress.completedLessons || [];
  if (completed.length === 0) return;

  const section = document.getElementById('completed-section');
  if (section) section.style.display = 'block';

  const list = document.getElementById('completed-list');
  if (!list) return;

  const completedLessons = lessonsData.filter(l => completed.includes(l.id));
  list.innerHTML = completedLessons.map(l => `
    <div class="completed-item" onclick="goToLesson('${l.id}')">
      <span class="item-emoji">${l.emoji || '📖'}</span>
      <span class="item-title">${l.title}</span>
      <span class="item-check">✓</span>
    </div>`).join('');
}

// ── Lesson path ───────────────────────────────────────────────────────────────
function renderLessonPath() {
  const container = document.getElementById('lesson-path');
  if (!container) return;

  const completed = userProgress.completedLessons || [];

  container.innerHTML = lessonsData.map((lesson, idx) => {
    const isCompleted = completed.includes(lesson.id);
    const isLocked    = idx > 0 && !completed.includes(lessonsData[idx - 1].id);
    const isCurrent   = !isCompleted && !isLocked;

    const dotClass = isCompleted ? 'completed' : isCurrent ? 'current' : 'locked';
    const dotIcon  = isCompleted ? '✓' : isCurrent ? '▶' : '🔒';
    const itemClass = isLocked ? 'path-item locked' : 'path-item clickable';
    const lineClass = isCompleted ? 'path-line completed' : 'path-line';
    const onclick   = isLocked ? '' : `onclick="goToLesson('${lesson.id}')"`;

    return `
      <div class="${itemClass}">
        <div class="path-left">
          <div class="path-dot ${dotClass}">${dotIcon}</div>
          <div class="${lineClass}"></div>
        </div>
        <div class="path-content" ${onclick}>
          <div class="path-card">
            <div class="path-card-top">
              <span class="path-emoji">${lesson.emoji || '📖'}</span>
              <span class="path-title">${lesson.title}</span>
              <span class="path-xp">+100 XP</span>
            </div>
            <div class="path-sub">${lesson.subtitle || ''}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Achievements ──────────────────────────────────────────────────────────────
function renderAchievements() {
  const completed = userProgress.completedLessons || [];
  const hasAny    = completed.some(id => BADGES[id]);

  const section = document.getElementById('achievements-section');
  if (section) section.style.display = hasAny ? 'block' : 'none';

  const grid = document.getElementById('achievement-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(BADGES).map(([id, badge]) => {
    const earned = completed.includes(id);
    return `
      <div class="achievement-badge ${earned ? 'earned' : 'locked'}">
        <span class="badge-emoji">${badge.emoji}</span>
        <div class="badge-name">${badge.name}</div>
      </div>`;
  }).join('');
}

// ── Toggle all lessons ────────────────────────────────────────────────────────
function setupToggle() {
  const btn = document.getElementById('toggle-all-lessons');
  const pathSection = document.getElementById('lesson-path-section');
  if (!btn || !pathSection) return;

  let allLoaded = false;
  let open = false;

  btn.addEventListener('click', async () => {
    if (!allLoaded) {
      btn.textContent = 'Loading...';
      btn.disabled = true;
      try {
        await loadLessonsData(true);
        allLoaded = true;
        renderLessonPath();
      } catch {
        btn.textContent = 'View full lesson path';
        btn.disabled = false;
        return;
      }
      btn.disabled = false;
    }

    open = !open;
    pathSection.style.display = open ? 'block' : 'none';
    btn.innerHTML = open
      ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9l5-5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Hide lesson path`
      : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> View full lesson path`;

    if (open) btn.classList.add('open');
    else btn.classList.remove('open');
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goToLesson(id) {
  window.location.href = `lesson-detail.html?id=${id}`;
}

// ── Error ─────────────────────────────────────────────────────────────────────
function showError(msg) {
  document.getElementById('loading').innerHTML = `
    <div style="text-align:center; color:var(--danger); padding:2rem;">
      <p style="font-size:2rem; margin-bottom:1rem;">⚠️</p>
      <h2 style="margin-bottom:0.75rem;">Something went wrong</h2>
      <p style="color:var(--subtext); margin-bottom:1.5rem;">${msg}</p>
      <button onclick="location.reload()" style="
        padding:0.65rem 1.25rem; background:var(--primary); color:white;
        border:none; border-radius:8px; cursor:pointer; font-size:0.9rem; font-weight:600;">
        Try Again
      </button>
    </div>`;
}

window.goToLesson = goToLesson;
