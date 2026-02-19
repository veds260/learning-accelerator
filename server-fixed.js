const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = NODE_ENV === 'production';

// Log startup environment
console.log(`🚀 Starting Learning Accelerator in ${NODE_ENV} mode`);
console.log(`📡 Port: ${PORT}`);
console.log(`📁 Working directory: ${__dirname}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Data directories
const STATIC_DIR = path.join(__dirname, 'data', 'static');
const RUNTIME_DIR = path.join(__dirname, 'data', 'runtime');

// Data files
const PROGRESS_FILE = path.join(RUNTIME_DIR, 'progress.json');
const QUIZ_FILE = path.join(RUNTIME_DIR, 'quiz-state.json');
const LESSON_CONTENT_FILE = path.join(STATIC_DIR, 'lesson-content.json');
const CHALLENGES_FILE = path.join(STATIC_DIR, 'manning-challenges.json');
const FLASHCARDS_FILE = path.join(STATIC_DIR, 'flashcards.json');
const QUIZ_QUESTIONS_FILE = path.join(STATIC_DIR, 'quiz-questions.json');
const CODE_EXERCISES_FILE = path.join(STATIC_DIR, 'code-exercises.json');

// Initialize data files
function initDataFiles() {
  try {
    // Ensure runtime directory exists
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      console.log('✅ Created runtime directory');
    }
    
    // Initialize progress.json if doesn't exist
    if (!fs.existsSync(PROGRESS_FILE)) {
      const initialProgress = {
        xp: 0,
        streak: 0,
        lastActive: null,
        completedSkills: [],
        completedLessons: [],
        milestones: []
      };
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(initialProgress, null, 2));
      console.log('✅ Initialized progress.json');
    }
    
    // Initialize quiz-state.json
    if (!fs.existsSync(QUIZ_FILE)) {
      // Load flashcards from static folder
      if (fs.existsSync(FLASHCARDS_FILE)) {
        try {
          const flashcardsData = JSON.parse(fs.readFileSync(FLASHCARDS_FILE, 'utf8'));
          const initialQuiz = {
            cards: flashcardsData.cards.map(card => ({
              ...card,
              repetitions: 0,
              interval: 0,
              easeFactor: 2.5,
              nextReview: new Date().toISOString(),
              created: new Date().toISOString()
            })),
            stats: flashcardsData.stats
          };
          fs.writeFileSync(QUIZ_FILE, JSON.stringify(initialQuiz, null, 2));
          console.log(`✅ Initialized ${flashcardsData.cards.length} flashcards`);
        } catch (error) {
          console.error('❌ Failed to load flashcards:', error.message);
        }
      } else {
        // Create empty quiz state
        const emptyQuiz = {
          cards: [],
          stats: { total: 0, mastered: 0, learning: 0, new: 0 }
        };
        fs.writeFileSync(QUIZ_FILE, JSON.stringify(emptyQuiz, null, 2));
        console.log('⚠️  No flashcards found, created empty quiz state');
      }
    }
    
    // Verify static files exist
    const requiredStatic = [
      { file: 'lesson-content.json', path: LESSON_CONTENT_FILE },
      { file: 'flashcards.json', path: FLASHCARDS_FILE },
      { file: 'manning-challenges.json', path: CHALLENGES_FILE }
    ];
    
    requiredStatic.forEach(({ file, path: filePath }) => {
      if (!fs.existsSync(filePath)) {
        console.error(`❌ CRITICAL: Missing static file: ${file} at ${filePath}`);
      } else {
        console.log(`✅ Found static file: ${file}`);
      }
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR in initDataFiles:', error);
    throw error;
  }
}

// Initialize on startup
initDataFiles();

// Helper functions
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message);
    throw error;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${file}:`, error.message);
    throw error;
  }
}

function updateStreak() {
  const progress = readJSON(PROGRESS_FILE);
  const today = new Date().toISOString().split('T')[0];
  
  if (progress.lastActive === today) {
    return progress.streak; // Already active today
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (progress.lastActive === yesterdayStr) {
    progress.streak += 1; // Continue streak
  } else if (progress.lastActive !== null) {
    progress.streak = 1; // Reset streak
  } else {
    progress.streak = 1; // First day
  }
  
  progress.lastActive = today;
  writeJSON(PROGRESS_FILE, progress);
  return progress.streak;
}

function checkMilestones(xp) {
  const milestones = [
    { threshold: 100, title: 'Bronze Learner', emoji: '🥉' },
    { threshold: 300, title: 'Silver Builder', emoji: '🥈' },
    { threshold: 600, title: 'Gold Shipper', emoji: '🥇' },
    { threshold: 1000, title: 'Diamond Maker', emoji: '💎' }
  ];
  
  return milestones
    .filter(m => xp >= m.threshold)
    .map(m => ({ ...m, unlocked: true }));
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check for Railway
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  };
  
  // Verify critical files exist
  const criticalFiles = [
    { name: 'lesson-content.json', path: LESSON_CONTENT_FILE },
    { name: 'flashcards.json', path: FLASHCARDS_FILE },
    { name: 'progress.json', path: PROGRESS_FILE }
  ];
  
  const fileChecks = criticalFiles.map(({ name, path }) => ({
    file: name,
    exists: fs.existsSync(path)
  }));
  
  const allFilesExist = fileChecks.every(check => check.exists);
  
  if (!allFilesExist) {
    health.status = 'degraded';
    health.missingFiles = fileChecks.filter(c => !c.exists);
  }
  
  res.status(allFilesExist ? 200 : 500).json(health);
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const quiz = readJSON(QUIZ_FILE);
    
    let challenges = [];
    if (fs.existsSync(CHALLENGES_FILE)) {
      challenges = readJSON(CHALLENGES_FILE);
    }
    
    const cardsdue = quiz.cards.filter(card => {
      if (!card.nextReview) return true;
      return new Date(card.nextReview) <= new Date();
    }).length;
    
    const nextChallenge = challenges.find(c => 
      !progress.completedSkills.includes(c.id)
    );
    
    const milestones = checkMilestones(progress.xp);
    
    res.json({
      xp: progress.xp,
      streak: progress.streak,
      cardsdue,
      nextChallenge: nextChallenge ? {
        title: nextChallenge.title,
        id: nextChallenge.id,
        xp: nextChallenge.xp,
        time: nextChallenge.timeEstimate
      } : null,
      milestones,
      completedSkills: progress.completedSkills.length,
      totalSkills: challenges.length
    });
  } catch (error) {
    console.error('Error in /api/dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Lessons
app.get('/api/lessons', async (req, res) => {
  try {
    if (!fs.existsSync(LESSON_CONTENT_FILE)) {
      return res.status(404).json({ 
        error: 'Lesson content not found',
        path: LESSON_CONTENT_FILE
      });
    }
    const lessons = readJSON(LESSON_CONTENT_FILE);
    res.json(lessons);
  } catch (error) {
    console.error('Error in /api/lessons:', error);
    res.status(500).json({ 
      error: 'Failed to load lessons',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.get('/api/lessons/:id', async (req, res) => {
  try {
    const lessons = readJSON(LESSON_CONTENT_FILE);
    const lesson = lessons.find(l => l.id === req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Error in /api/lessons/:id:', error);
    res.status(500).json({ 
      error: 'Failed to load lesson',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.post('/api/lessons/:id/complete', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const lessons = readJSON(LESSON_CONTENT_FILE);
    const lesson = lessons.find(l => l.id === req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Initialize completedLessons if not exists
    if (!progress.completedLessons) {
      progress.completedLessons = [];
    }
    
    // Check if already completed
    if (progress.completedLessons.includes(lesson.id)) {
      return res.json({ 
        message: 'Already completed',
        xp: progress.xp,
        streak: progress.streak
      });
    }
    
    // Add to completed lessons
    progress.completedLessons.push(lesson.id);
    
    // Award XP (100 per lesson)
    progress.xp += 100;
    
    // Update streak
    const newStreak = updateStreak();
    
    // Calculate milestones
    const milestones = checkMilestones(progress.xp);
    
    writeJSON(PROGRESS_FILE, progress);
    
    res.json({
      xp: progress.xp,
      xpGained: 100,
      streak: newStreak,
      milestones,
      completedLessons: progress.completedLessons.length,
      message: `+100 XP! Total: ${progress.xp}`
    });
  } catch (error) {
    console.error('Error in /api/lessons/:id/complete:', error);
    res.status(500).json({ 
      error: 'Failed to complete lesson',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Challenges
app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = fs.existsSync(CHALLENGES_FILE) ? readJSON(CHALLENGES_FILE) : [];
    const progress = readJSON(PROGRESS_FILE);
    
    const enrichedChallenges = challenges.map(c => ({
      ...c,
      completed: progress.completedSkills.includes(c.id)
    }));
    
    res.json(enrichedChallenges);
  } catch (error) {
    console.error('Error in /api/challenges:', error);
    res.status(500).json({ 
      error: 'Failed to load challenges',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.get('/api/challenges/:id', async (req, res) => {
  try {
    const challenges = readJSON(CHALLENGES_FILE);
    const challenge = challenges.find(c => c.id === req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    res.json(challenge);
  } catch (error) {
    console.error('Error in /api/challenges/:id:', error);
    res.status(500).json({ 
      error: 'Failed to load challenge',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.post('/api/challenges/:id/complete', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const challenges = readJSON(CHALLENGES_FILE);
    const challenge = challenges.find(c => c.id === req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (progress.completedSkills.includes(challenge.id)) {
      return res.json({ message: 'Already completed' });
    }
    
    progress.completedSkills.push(challenge.id);
    progress.xp += challenge.xp;
    
    const newStreak = updateStreak();
    const milestones = checkMilestones(progress.xp);
    
    writeJSON(PROGRESS_FILE, progress);
    
    res.json({
      xp: progress.xp,
      xpGained: challenge.xp,
      streak: newStreak,
      milestones,
      message: `+${challenge.xp} XP! Total: ${progress.xp}`
    });
  } catch (error) {
    console.error('Error in /api/challenges/:id/complete:', error);
    res.status(500).json({ 
      error: 'Failed to complete challenge',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Quiz
app.get('/api/quiz/cards', async (req, res) => {
  try {
    const quiz = readJSON(QUIZ_FILE);
    res.json(quiz.cards);
  } catch (error) {
    console.error('Error in /api/quiz/cards:', error);
    res.status(500).json({ 
      error: 'Failed to load quiz cards',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.get('/api/quiz/due', async (req, res) => {
  try {
    const quiz = readJSON(QUIZ_FILE);
    const dueCards = quiz.cards.filter(card => {
      if (!card.nextReview) return true;
      return new Date(card.nextReview) <= new Date();
    });
    
    res.json(dueCards);
  } catch (error) {
    console.error('Error in /api/quiz/due:', error);
    res.status(500).json({ 
      error: 'Failed to load due cards',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.post('/api/quiz/review', async (req, res) => {
  try {
    const { cardId, quality } = req.body; // quality: 0-5 (SM-2 algorithm)
    const quiz = readJSON(QUIZ_FILE);
    const card = quiz.cards.find(c => c.id === cardId);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // SM-2 algorithm
    if (quality >= 3) {
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetitions += 1;
    } else {
      card.repetitions = 0;
      card.interval = 1;
    }
    
    card.easeFactor += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (card.easeFactor < 1.3) card.easeFactor = 1.3;
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + card.interval);
    card.nextReview = nextReview.toISOString();
    card.lastReviewed = new Date().toISOString();
    
    writeJSON(QUIZ_FILE, quiz);
    updateStreak();
    
    res.json({ message: 'Review recorded', nextReview: card.nextReview });
  } catch (error) {
    console.error('Error in /api/quiz/review:', error);
    res.status(500).json({ 
      error: 'Failed to record review',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Quiz questions (for lessons)
app.get('/api/quiz/:lessonId', async (req, res) => {
  try {
    if (!fs.existsSync(QUIZ_QUESTIONS_FILE)) {
      return res.json({ inLessonQuizzes: [], finalQuiz: null });
    }
    const quizzes = readJSON(QUIZ_QUESTIONS_FILE);
    const lessonQuiz = quizzes.find(q => q.lessonId === req.params.lessonId);
    res.json(lessonQuiz || { inLessonQuizzes: [], finalQuiz: null });
  } catch (error) {
    console.error('Error in /api/quiz/:lessonId:', error);
    res.status(500).json({ 
      error: 'Failed to load quiz',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Code exercises
app.get('/api/code-exercises/:lessonId', async (req, res) => {
  try {
    if (!fs.existsSync(CODE_EXERCISES_FILE)) {
      return res.json({ exercises: [] });
    }
    const exercises = readJSON(CODE_EXERCISES_FILE);
    const lessonExercises = exercises.find(e => e.lessonId === req.params.lessonId);
    res.json(lessonExercises || { exercises: [] });
  } catch (error) {
    console.error('Error in /api/code-exercises/:lessonId:', error);
    res.status(500).json({ 
      error: 'Failed to load exercises',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Progress
app.get('/api/progress', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const challenges = fs.existsSync(CHALLENGES_FILE) ? readJSON(CHALLENGES_FILE) : [];
    
    const tiers = {
      foundation: challenges.filter(c => c.tier === 'foundation'),
      intermediate: challenges.filter(c => c.tier === 'intermediate'),
      advanced: challenges.filter(c => c.tier === 'advanced')
    };
    
    const tierProgress = {
      foundation: {
        total: tiers.foundation.length,
        completed: tiers.foundation.filter(c => progress.completedSkills.includes(c.id)).length
      },
      intermediate: {
        total: tiers.intermediate.length,
        completed: tiers.intermediate.filter(c => progress.completedSkills.includes(c.id)).length
      },
      advanced: {
        total: tiers.advanced.length,
        completed: tiers.advanced.filter(c => progress.completedSkills.includes(c.id)).length
      }
    };
    
    res.json({
      ...progress,
      tierProgress,
      milestones: checkMilestones(progress.xp)
    });
  } catch (error) {
    console.error('Error in /api/progress:', error);
    res.status(500).json({ 
      error: 'Failed to load progress',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Teach Back
app.post('/api/teachback/submit', async (req, res) => {
  try {
    const { concept, explanation } = req.body;
    
    // Simple validation - in real version, this would use AI to validate
    const minLength = 200; // characters
    const hasExample = explanation.toLowerCase().includes('example') || 
                       explanation.toLowerCase().includes('for instance');
    const hasUseCase = explanation.toLowerCase().includes('use') ||
                       explanation.toLowerCase().includes('practical');
    
    const score = {
      length: explanation.length >= minLength,
      hasExample,
      hasUseCase,
      overall: explanation.length >= minLength && hasExample && hasUseCase
    };
    
    if (score.overall) {
      updateStreak();
    }
    
    res.json({
      score,
      feedback: score.overall 
        ? '✅ Good explanation! You clearly understand this concept.'
        : '❌ Needs more detail. Add a real-world example and practical use case.',
      passed: score.overall
    });
  } catch (error) {
    console.error('Error in /api/teachback/submit:', error);
    res.status(500).json({ 
      error: 'Failed to submit teach back',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const quiz = readJSON(QUIZ_FILE);
    const challenges = fs.existsSync(CHALLENGES_FILE) ? readJSON(CHALLENGES_FILE) : [];
    
    res.json({
      totalXP: progress.xp,
      currentStreak: progress.streak,
      skillsCompleted: progress.completedSkills.length,
      totalSkills: challenges.length,
      cardsTotal: quiz.cards.length,
      milestones: checkMilestones(progress.xp)
    });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ 
      error: 'Failed to load stats',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: IS_PRODUCTION ? 'Something went wrong' : err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Learning Accelerator running on http://localhost:${PORT}`);
  console.log(`📚 Lessons available at http://localhost:${PORT}/lessons.html`);
  console.log(`💚 Health check at http://localhost:${PORT}/health`);
  
  // Verify lesson content file exists
  if (fs.existsSync(LESSON_CONTENT_FILE)) {
    const lessons = JSON.parse(fs.readFileSync(LESSON_CONTENT_FILE, 'utf8'));
    console.log(`✅ Loaded ${lessons.length} lessons from lesson-content.json`);
  } else {
    console.error(`❌ CRITICAL: lesson-content.json NOT FOUND at ${LESSON_CONTENT_FILE}`);
  }
});

// Global error handlers (prevent crashes)
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error(error.stack);
  // Don't exit - let Railway handle restart
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  // Don't exit - log and continue
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
