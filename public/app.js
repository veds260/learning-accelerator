// API Base URL
const API_BASE = window.location.origin;

// State
let currentView = 'dashboard';
let dashboardData = null;
let challenges = [];
let currentCard = null;
let quizCards = [];

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  loadDashboard();
});

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  // Update nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  // Update views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === view);
  });

  currentView = view;

  // Load view data
  if (view === 'dashboard') loadDashboard();
  if (view === 'challenges') loadChallenges();
  if (view === 'quiz') loadQuiz();
  if (view === 'progress') loadProgress();
}

// Event Listeners
function setupEventListeners() {
  // Dashboard quick actions
  document.getElementById('next-challenge-btn').addEventListener('click', () => {
    switchView('challenges');
  });

  document.getElementById('review-cards-btn').addEventListener('click', () => {
    switchView('quiz');
  });

  document.getElementById('teach-back-btn').addEventListener('click', () => {
    switchView('teachback');
  });

  document.getElementById('view-progress-btn').addEventListener('click', () => {
    switchView('progress');
  });

  // Teach Back
  const explanation = document.getElementById('explanation');
  const charCount = document.getElementById('char-count');
  
  explanation.addEventListener('input', () => {
    charCount.textContent = `${explanation.value.length} characters`;
  });

  document.getElementById('submit-teachback').addEventListener('click', submitTeachBack);
}

// Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/api/dashboard`);
    dashboardData = await response.json();

    // Update stats
    document.getElementById('xp-value').textContent = dashboardData.xp;
    document.getElementById('streak-value').textContent = dashboardData.streak;
    document.getElementById('skills-value').textContent = 
      `${dashboardData.completedSkills}/${dashboardData.totalSkills}`;
    document.getElementById('cards-value').textContent = dashboardData.cardsdue;

    // Update milestones
    renderMilestones(dashboardData.milestones);

    // Update next lesson (new!)
    await loadNextLesson();

    // Update next challenge
    if (dashboardData.nextChallenge) {
      document.getElementById('next-challenge-name').textContent = 
        `${dashboardData.nextChallenge.title} (+${dashboardData.nextChallenge.xp} XP)`;
    } else {
      document.getElementById('next-challenge-name').textContent = 
        'All challenges complete! 🎉';
    }

    document.getElementById('cards-due-text').textContent = 
      `${dashboardData.cardsdue} card${dashboardData.cardsdue !== 1 ? 's' : ''} due`;

  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Load next lesson for dashboard
async function loadNextLesson() {
  try {
    const lessonsResponse = await fetch(`${API_BASE}/api/lessons`);
    const lessons = await lessonsResponse.json();
    
    const progressResponse = await fetch(`${API_BASE}/api/progress`);
    const progress = await progressResponse.json();
    
    const completedLessons = progress.completedLessons || [];
    const nextLesson = lessons.find(lesson => !completedLessons.includes(lesson.id));
    
    if (nextLesson) {
      document.getElementById('next-lesson-name').textContent = 
        `${nextLesson.title} (+100 XP)`;
    } else {
      document.getElementById('next-lesson-name').textContent = 
        'All lessons complete! 🎉';
    }
  } catch (error) {
    console.error('Failed to load next lesson:', error);
    document.getElementById('next-lesson-name').textContent = 'View lessons';
  }
}

function renderMilestones(milestones) {
  const container = document.getElementById('milestones-container');
  const allMilestones = [
    { threshold: 100, title: 'Bronze Learner', emoji: '🥉' },
    { threshold: 300, title: 'Silver Builder', emoji: '🥈' },
    { threshold: 600, title: 'Gold Shipper', emoji: '🥇' },
    { threshold: 1000, title: 'Diamond Maker', emoji: '💎' }
  ];

  container.innerHTML = allMilestones.map(m => {
    const unlocked = milestones.some(um => um.threshold === m.threshold);
    return `
      <div class="milestone ${unlocked ? 'unlocked' : ''}">
        <div class="milestone-emoji">${m.emoji}</div>
        <div>
          <div class="milestone-text">${m.title}</div>
          <div class="milestone-xp">${m.threshold} XP</div>
        </div>
      </div>
    `;
  }).join('');
}

// Challenges
async function loadChallenges() {
  try {
    const response = await fetch(`${API_BASE}/api/challenges`);
    challenges = await response.json();

    // Group by tier
    const foundation = challenges.filter(c => c.tier === 'foundation');
    const intermediate = challenges.filter(c => c.tier === 'intermediate');
    const advanced = challenges.filter(c => c.tier === 'advanced');

    renderChallenges('foundation-challenges', foundation);
    renderChallenges('intermediate-challenges', intermediate);
    renderChallenges('advanced-challenges', advanced);

  } catch (error) {
    console.error('Failed to load challenges:', error);
  }
}

function renderChallenges(containerId, challengeList) {
  const container = document.getElementById(containerId);
  
  container.innerHTML = challengeList.map(c => `
    <div class="challenge-card ${c.completed ? 'completed' : ''}" onclick="showChallenge('${c.id}')">
      <div class="challenge-title">${c.title}</div>
      <div class="challenge-desc">${c.description}</div>
      <div class="challenge-meta">
        <div class="challenge-time">⏱️ ${c.timeEstimate}</div>
        <div class="challenge-xp">⚡ +${c.xp} XP</div>
      </div>
    </div>
  `).join('');
}

function showChallenge(id) {
  const challenge = challenges.find(c => c.id === id);
  if (!challenge) return;

  const modal = document.getElementById('challenge-modal');
  const detail = document.getElementById('challenge-detail');

  detail.innerHTML = `
    <h2>${challenge.title}</h2>
    <p>${challenge.description}</p>
    
    <div class="challenge-meta">
      <div class="challenge-time">⏱️ ${challenge.timeEstimate}</div>
      <div class="challenge-xp">⚡ +${challenge.xp} XP</div>
    </div>

    <div class="tasks-list">
      <h3>Tasks</h3>
      ${challenge.tasks.map(task => `<div class="task-item">${task}</div>`).join('')}
    </div>

    <div class="win-condition">
      <h3>✅ Win Condition</h3>
      <p>${challenge.winCondition}</p>
    </div>

    ${!challenge.completed ? `
      <button class="btn success" onclick="markComplete('${challenge.id}')">
        Mark as Complete
      </button>
    ` : '<p style="color: var(--success); font-weight: 600;">✓ Completed</p>'}
  `;

  modal.classList.add('active');
}

document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('challenge-modal').classList.remove('active');
});

async function markComplete(id) {
  try {
    const response = await fetch(`${API_BASE}/api/challenges/${id}/complete`, {
      method: 'POST'
    });
    const result = await response.json();

    alert(`🎉 ${result.message}\n\nStreak: ${result.streak} days`);

    document.getElementById('challenge-modal').classList.remove('active');
    loadChallenges();
    loadDashboard();

  } catch (error) {
    console.error('Failed to mark complete:', error);
    alert('Error marking challenge complete');
  }
}

// Quiz
async function loadQuiz() {
  try {
    const response = await fetch(`${API_BASE}/api/quiz/due`);
    quizCards = await response.json();

    if (quizCards.length === 0) {
      showNoCards();
    } else {
      currentCard = quizCards[0];
      showCard(false);
    }

  } catch (error) {
    console.error('Failed to load quiz:', error);
  }
}

function showNoCards() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = `
    <div class="no-cards">
      <h3>🎉 No cards due!</h3>
      <p>Check back later or add custom cards.</p>
      <button class="btn" onclick="loadDashboard(); switchView('dashboard');">
        Back to Dashboard
      </button>
    </div>
  `;
}

function showCard(showAnswer) {
  if (!currentCard) return;

  const container = document.getElementById('quiz-container');
  
  container.innerHTML = `
    <div class="quiz-card">
      <h2>Card ${quizCards.indexOf(currentCard) + 1} of ${quizCards.length}</h2>
      
      ${!showAnswer ? `
        <div class="card-front">
          <p><strong>Question:</strong></p>
          <p>${currentCard.front}</p>
        </div>
        <div class="quiz-actions">
          <button class="quiz-btn show" onclick="revealAnswer()">Show Answer</button>
        </div>
      ` : `
        <div class="card-front">
          <p><strong>Question:</strong></p>
          <p>${currentCard.front}</p>
        </div>
        <div class="card-back">
          <p><strong>Answer:</strong></p>
          <p>${currentCard.back}</p>
        </div>
        <div class="quiz-actions">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">How well did you know this?</p>
          <button class="quiz-btn quality" onclick="rateCard(0)">0 - No idea</button>
          <button class="quiz-btn quality" onclick="rateCard(3)">3 - Hard</button>
          <button class="quiz-btn quality" onclick="rateCard(4)">4 - Good</button>
          <button class="quiz-btn quality" onclick="rateCard(5)">5 - Easy</button>
        </div>
      `}
    </div>
  `;
}

function revealAnswer() {
  showCard(true);
}

async function rateCard(quality) {
  try {
    await fetch(`${API_BASE}/api/quiz/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: currentCard.id, quality })
    });

    // Move to next card
    const currentIndex = quizCards.indexOf(currentCard);
    if (currentIndex < quizCards.length - 1) {
      currentCard = quizCards[currentIndex + 1];
      showCard(false);
    } else {
      // All cards reviewed
      document.getElementById('quiz-container').innerHTML = `
        <div class="no-cards">
          <h3>🎉 All cards reviewed!</h3>
          <p>Great work! Your learning streak continues.</p>
          <button class="btn" onclick="loadDashboard(); switchView('dashboard');">
            Back to Dashboard
          </button>
        </div>
      `;
    }

  } catch (error) {
    console.error('Failed to rate card:', error);
  }
}

// Teach Back
async function submitTeachBack() {
  const concept = document.getElementById('concept-select').value;
  const explanation = document.getElementById('explanation').value;
  const resultBox = document.getElementById('teachback-result');

  if (!concept) {
    alert('Please select a concept');
    return;
  }

  if (explanation.length < 200) {
    alert('Explanation must be at least 200 characters');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/teachback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, explanation })
    });

    const result = await response.json();

    resultBox.style.display = 'block';
    resultBox.className = `result-box ${result.passed ? 'pass' : 'fail'}`;

    resultBox.innerHTML = `
      <div class="result-title">${result.passed ? '✅ Passed!' : '❌ Needs Work'}</div>
      <div class="result-feedback">${result.feedback}</div>
      <div class="result-checks">
        <div class="check-item ${result.score.length ? 'pass' : 'fail'}">
          <div class="icon">${result.score.length ? '✓' : '✗'}</div>
          <span>Sufficient length (200+ characters)</span>
        </div>
        <div class="check-item ${result.score.hasExample ? 'pass' : 'fail'}">
          <div class="icon">${result.score.hasExample ? '✓' : '✗'}</div>
          <span>Includes real-world example</span>
        </div>
        <div class="check-item ${result.score.hasUseCase ? 'pass' : 'fail'}">
          <div class="icon">${result.score.hasUseCase ? '✓' : '✗'}</div>
          <span>Mentions practical use case</span>
        </div>
      </div>
    `;

    if (result.passed) {
      setTimeout(() => {
        document.getElementById('concept-select').value = '';
        document.getElementById('explanation').value = '';
        document.getElementById('char-count').textContent = '0 characters';
        resultBox.style.display = 'none';
      }, 3000);
    }

  } catch (error) {
    console.error('Failed to submit teach back:', error);
    alert('Error submitting explanation');
  }
}

// Progress
async function loadProgress() {
  try {
    const response = await fetch(`${API_BASE}/api/progress`);
    const progress = await response.json();

    // Update XP bar
    const nextMilestone = [100, 300, 600, 1000].find(m => m > progress.xp) || 1000;
    const prevMilestone = [0, 100, 300, 600].reverse().find(m => m <= progress.xp) || 0;
    const xpProgress = ((progress.xp - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

    document.getElementById('current-xp').textContent = progress.xp;
    document.getElementById('next-milestone').textContent = nextMilestone;
    document.getElementById('xp-fill').style.width = `${xpProgress}%`;

    // Update tier progress
    updateTierProgress('foundation', progress.tierProgress.foundation);
    updateTierProgress('intermediate', progress.tierProgress.intermediate);
    updateTierProgress('advanced', progress.tierProgress.advanced);

    // Update achievements
    renderAchievements(progress.milestones);

    // Load full challenges for skill details
    const challengesResponse = await fetch(`${API_BASE}/api/challenges`);
    const allChallenges = await challengesResponse.json();

    // Render tier skills
    renderTierSkills('foundation', allChallenges.filter(c => c.tier === 'foundation'), progress.completedSkills);
    renderTierSkills('intermediate', allChallenges.filter(c => c.tier === 'intermediate'), progress.completedSkills);
    renderTierSkills('advanced', allChallenges.filter(c => c.tier === 'advanced'), progress.completedSkills);

  } catch (error) {
    console.error('Failed to load progress:', error);
  }
}

function updateTierProgress(tier, data) {
  const percent = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  document.getElementById(`${tier}-fill`).style.width = `${percent}%`;
  document.getElementById(`${tier}-text`).textContent = `${data.completed}/${data.total}`;
}

function renderTierSkills(tier, challenges, completedIds) {
  const container = document.getElementById(`${tier}-skills`);
  
  container.innerHTML = challenges.map(c => {
    const completed = completedIds.includes(c.id);
    return `
      <div class="skill-item ${completed ? 'completed' : 'locked'}">
        <span>${completed ? '✓' : '○'}</span>
        <span>${c.title}</span>
      </div>
    `;
  }).join('');
}

function renderAchievements(milestones) {
  const container = document.getElementById('achievements-grid');
  const allAchievements = [
    { threshold: 100, title: 'Bronze Learner', emoji: '🥉', desc: '100 XP earned' },
    { threshold: 300, title: 'Silver Builder', emoji: '🥈', desc: '300 XP earned' },
    { threshold: 600, title: 'Gold Shipper', emoji: '🥇', desc: '600 XP earned' },
    { threshold: 1000, title: 'Diamond Maker', emoji: '💎', desc: '1000 XP earned' }
  ];

  container.innerHTML = allAchievements.map(a => {
    const unlocked = milestones.some(m => m.threshold === a.threshold);
    return `
      <div class="achievement ${unlocked ? 'unlocked' : ''}">
        <div class="achievement-emoji">${a.emoji}</div>
        <div class="achievement-title">${a.title}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>
    `;
  }).join('');
}
