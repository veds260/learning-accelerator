// Lessons View Logic

let lessonsData = [];
let userProgress = {
  completedLessons: [],
  currentLevel: 1,
  totalXP: 0
};

// Client-side progress storage
const STORAGE_KEY = 'learning-accelerator-progress';

function loadLocalProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      completedLessons: [],
      xp: 0,
      streak: 0,
      lastActive: null
    };
  } catch (error) {
    console.error('Failed to load progress:', error);
    return { completedLessons: [], xp: 0, streak: 0, lastActive: null };
  }
}

const BADGES = {
  'tokenization': { emoji: '🧩', name: 'Word Breaker' },
  'special-tokens': { emoji: '🎯', name: 'Token Master' },
  'byte-pair-encoding': { emoji: '🔀', name: 'Merge Wizard' },
  'data-sampling': { emoji: '📊', name: 'Data Sampler' },
  'embeddings': { emoji: '🗺️', name: 'Vector Navigator' }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadLessonsData();
  await loadUserProgress();
  renderLessonsView();
  setupEventListeners();
});

// Load lesson content
async function loadLessonsData() {
  try {
    const response = await fetch('/api/lessons');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    lessonsData = await response.json();
    console.log('Loaded lessons:', lessonsData.length);
  } catch (error) {
    console.error('Failed to load lessons:', error);
    showError(`Failed to load lessons: ${error.message}`);
  }
}

// Load user progress
async function loadUserProgress() {
  try {
    // Load from localStorage instead of server
    const progress = loadLocalProgress();
    
    // Extract lesson completion from progress
    userProgress.completedLessons = progress.completedLessons || [];
    userProgress.totalXP = progress.xp || 0;
    userProgress.currentLevel = calculateLevel(userProgress.completedLessons.length);
    userProgress.streak = progress.streak || 0;
    
    console.log('✅ Loaded progress from localStorage:', userProgress);
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
}

// Calculate level based on completed lessons
function calculateLevel(completedCount) {
  return Math.min(completedCount + 1, 5);
}

// Render lessons list view
function renderLessonsView() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('lessons-list').style.display = 'block';
  
  const completedCount = userProgress.completedLessons.length;
  
  // Progressive disclosure: show stats only after first lesson
  if (completedCount > 0) {
    document.getElementById('progress-overview').style.display = 'grid';
    
    // Update progress overview
    const totalLessonsXP = lessonsData.reduce((sum, lesson) => sum + 100, 0);
    const earnedXP = completedCount * 100;
    
    document.getElementById('current-level').textContent = userProgress.currentLevel;
    document.getElementById('lesson-xp').textContent = earnedXP;
    document.getElementById('lesson-xp-total').textContent = totalLessonsXP;
    
    const xpPercent = (earnedXP / totalLessonsXP) * 100;
    document.getElementById('lesson-xp-fill').style.width = `${xpPercent}%`;
    
    // Show streak after 3 lessons
    if (completedCount >= 3 && userProgress.streak > 0) {
      document.getElementById('streak-display').style.display = 'flex';
      document.getElementById('lesson-streak').textContent = userProgress.streak;
    }
    
    // Show completed lessons
    document.getElementById('completed-section').style.display = 'block';
    renderCompletedLessons();
    
    // Show achievements after first lesson
    document.getElementById('achievements-preview').style.display = 'block';
    renderAchievements();
  }
  
  // Render next lesson card
  renderNextLessonCard();
  
  // Render lesson path (collapsed by default)
  renderLessonPath();
}

// Render completed lessons
function renderCompletedLessons() {
  const container = document.getElementById('completed-list');
  const completed = lessonsData.filter(l => userProgress.completedLessons.includes(l.id));
  
  if (completed.length === 0) return;
  
  container.innerHTML = completed.map(lesson => `
    <div class="completed-lesson" onclick="window.location.href='lesson-detail.html?id=${lesson.id}'">
      ✅ ${lesson.title}
    </div>
  `).join('');
}

// Render "What's Next" card
function renderNextLessonCard() {
  const nextLesson = lessonsData.find(
    lesson => !userProgress.completedLessons.includes(lesson.id)
  );
  
  const container = document.getElementById('next-lesson-card');
  
  if (!nextLesson) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🎉</span>
        <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Foundation Complete!</h3>
        <p style="opacity: 0.9;">You've mastered all Foundation lessons. Time to build!</p>
        <button class="next-lesson-cta" onclick="window.location.href='index.html#challenges'">
          View Build Challenges →
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <span class="next-lesson-emoji">${nextLesson.emoji}</span>
    <h3 class="next-lesson-title">${nextLesson.title}</h3>
    <p class="next-lesson-subtitle">${nextLesson.subtitle}</p>
    <button class="next-lesson-cta" onclick="window.location.href='lesson-detail.html?id=${nextLesson.id}'">
      Start Learning →
    </button>
  `;
}

// Render lesson path
function renderLessonPath() {
  const container = document.getElementById('lesson-path');
  
  container.innerHTML = lessonsData.map((lesson, index) => {
    const isCompleted = userProgress.completedLessons.includes(lesson.id);
    const isLocked = index > 0 && !userProgress.completedLessons.includes(lessonsData[index - 1].id);
    const isCurrent = !isCompleted && !isLocked;
    
    let statusIcon = '';
    let cardClass = 'lesson-card';
    
    if (isCompleted) {
      statusIcon = '✅';
      cardClass += ' completed';
    } else if (isLocked) {
      statusIcon = '🔒';
      cardClass += ' locked';
    } else if (isCurrent) {
      statusIcon = '▶️';
      cardClass += ' current';
    }
    
    // Allow clicking on current OR completed lessons (not locked)
    const clickHandler = isLocked ? '' : `onclick="window.location.href='lesson-detail.html?id=${lesson.id}'"`;
    const cursorStyle = isLocked ? '' : 'style="cursor: pointer;"';
    
    return `
      <div class="${cardClass}" ${clickHandler} ${cursorStyle}>
        <span class="lesson-card-emoji">${lesson.emoji}</span>
        <div class="lesson-card-content">
          <div class="lesson-card-level">Level ${lesson.level}</div>
          <div class="lesson-card-title">${lesson.title}</div>
          <div class="lesson-card-subtitle">${lesson.subtitle}</div>
        </div>
        <div class="lesson-card-status">
          <span class="status-icon">${statusIcon}</span>
          <span class="lesson-card-xp">+100 XP</span>
        </div>
      </div>
    `;
  }).join('');
}

// Render achievements
function renderAchievements() {
  const container = document.getElementById('achievement-grid');
  
  container.innerHTML = Object.entries(BADGES).map(([lessonId, badge]) => {
    const isEarned = userProgress.completedLessons.includes(lessonId);
    const badgeClass = isEarned ? 'achievement-badge earned' : 'achievement-badge locked';
    
    return `
      <div class="${badgeClass}">
        <span class="achievement-emoji">${badge.emoji}</span>
        <div class="achievement-name">${badge.name}</div>
      </div>
    `;
  }).join('');
}

// View individual lesson - just redirect to detail page
function viewLesson(lessonId) {
  window.location.href = `lesson-detail.html?id=${lessonId}`;
}

// Render lesson detail
function renderLessonDetail(lesson) {
  // Header
  document.getElementById('detail-level').textContent = `Level ${lesson.level}`;
  document.getElementById('detail-xp').textContent = '+100 XP';
  
  // Story section
  document.getElementById('lesson-emoji').textContent = lesson.emoji;
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('lesson-subtitle').textContent = lesson.subtitle;
  document.getElementById('lesson-story').textContent = lesson.story;
  document.getElementById('lesson-hook').textContent = lesson.hook;
  
  // Concept
  document.getElementById('lesson-concept').textContent = lesson.concept;
  
  // Analogy
  document.getElementById('lesson-analogy').textContent = lesson.analogy;
  
  // Visual
  document.getElementById('lesson-visual').textContent = lesson.visual;
  
  // Interactive examples
  const examplesContainer = document.getElementById('interactive-examples');
  examplesContainer.innerHTML = lesson.interactive.map(example => {
    if (example.type === 'code') {
      return `
        <div class="example-card">
          <div class="example-header">
            <div class="example-title">${example.title}</div>
            <div class="example-description">${example.description}</div>
          </div>
          <div class="example-code">
            <pre>${escapeHtml(example.code)}</pre>
          </div>
          <div class="example-explanation">
            ${example.explanation}
          </div>
        </div>
      `;
    } else if (example.type === 'exercise') {
      return `
        <div class="example-card">
          <div class="example-exercise">
            <div class="example-title">${example.title}</div>
            <div class="exercise-question">${example.question}</div>
            <div class="exercise-answer">${example.answer}</div>
            <div class="exercise-hint">💡 Hint: ${example.hint}</div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  // Key points
  const keypointsList = document.getElementById('keypoints-list');
  keypointsList.innerHTML = lesson.keyPoints.map(point => 
    `<li>${point}</li>`
  ).join('');
  
  // Real world
  const realworldList = document.getElementById('realworld-list');
  realworldList.innerHTML = lesson.realWorld.map(item => 
    `<li>${item}</li>`
  ).join('');
  
  // Easter egg
  document.getElementById('easter-egg-text').textContent = lesson.easterEgg;
  
  // Challenge preview
  document.getElementById('challenge-preview-text').textContent = lesson.challenge.preview;
  document.getElementById('challenge-xp').textContent = lesson.challenge.xp;
  
  // Store current lesson for completion
  document.getElementById('complete-lesson-btn').setAttribute('data-lesson-id', lesson.id);
}

// Complete lesson
async function completeLesson(lessonId) {
  try {
    const response = await fetch(`/api/lessons/${lessonId}/complete`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    // Update local progress
    if (!userProgress.completedLessons.includes(lessonId)) {
      userProgress.completedLessons.push(lessonId);
      userProgress.totalXP = result.xp;
    }
    
    // Show completion modal
    showCompletionModal(lessonId, result);
    
  } catch (error) {
    console.error('Failed to complete lesson:', error);
    alert('Failed to save progress. Please try again.');
  }
}

// Show completion modal
function showCompletionModal(lessonId, result) {
  const lesson = lessonsData.find(l => l.id === lessonId);
  const badge = BADGES[lessonId];
  
  document.getElementById('reward-xp').textContent = '100';
  document.getElementById('earned-badge-emoji').textContent = badge.emoji;
  document.getElementById('earned-badge-name').textContent = badge.name;
  
  // Check for level up
  const newLevel = calculateLevel(userProgress.completedLessons.length);
  if (newLevel > userProgress.currentLevel) {
    document.getElementById('level-up-notice').style.display = 'block';
    document.getElementById('new-level').textContent = newLevel;
    userProgress.currentLevel = newLevel;
  } else {
    document.getElementById('level-up-notice').style.display = 'none';
  }
  
  // Set up next lesson button
  const lessonIndex = lessonsData.findIndex(l => l.id === lessonId);
  const nextLesson = lessonsData[lessonIndex + 1];
  
  const nextLessonBtn = document.getElementById('next-lesson-btn');
  if (nextLesson) {
    nextLessonBtn.textContent = `Continue to ${nextLesson.title} →`;
    nextLessonBtn.onclick = () => {
      closeCompletionModal();
      viewLesson(nextLesson.id);
    };
  } else {
    nextLessonBtn.textContent = 'View Build Challenges →';
    nextLessonBtn.onclick = () => {
      window.location.href = 'index.html#challenges';
    };
  }
  
  // Set up challenge button
  document.getElementById('view-challenge-btn').onclick = () => {
    window.location.href = `index.html#challenges`;
  };
  
  document.getElementById('completion-modal').style.display = 'flex';
}

// Close completion modal
function closeCompletionModal() {
  document.getElementById('completion-modal').style.display = 'none';
  
  // Go back to lessons list
  document.getElementById('lesson-detail').style.display = 'none';
  document.getElementById('lessons-list').style.display = 'block';
  
  // Re-render to update progress
  renderLessonsView();
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// Back to lessons list
function backToLessons() {
  document.getElementById('lesson-detail').style.display = 'none';
  document.getElementById('lessons-list').style.display = 'block';
  renderLessonsView();
  window.scrollTo(0, 0);
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('back-to-lessons')?.addEventListener('click', backToLessons);
  
  document.getElementById('complete-lesson-btn')?.addEventListener('click', (e) => {
    const lessonId = e.target.getAttribute('data-lesson-id');
    if (lessonId) {
      completeLesson(lessonId);
    }
  });
  
  // Toggle "View All Lessons"
  const toggleBtn = document.getElementById('toggle-all-lessons');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const pathSection = document.getElementById('lesson-path-section');
      const isHidden = pathSection.style.display === 'none';
      
      if (isHidden) {
        pathSection.style.display = 'block';
        toggleBtn.textContent = 'Hide All Lessons';
      } else {
        pathSection.style.display = 'none';
        toggleBtn.textContent = 'View All Lessons';
      }
    });
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const loading = document.getElementById('loading');
  loading.innerHTML = `
    <div style="text-align: center; color: #ef4444;">
      <p style="font-size: 2rem; margin-bottom: 1rem;">⚠️</p>
      <p>${message}</p>
      <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
        Retry
      </button>
    </div>
  `;
}

// Export for inline handlers
window.viewLesson = viewLesson;
window.completeLesson = completeLesson;
window.closeCompletionModal = closeCompletionModal;
window.backToLessons = backToLessons;
