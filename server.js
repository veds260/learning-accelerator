const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// CRITICAL: Use Railway's PORT or default to 3000
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

console.log('='.repeat(50));
console.log('🚀 STARTING LEARNING ACCELERATOR');
console.log('='.repeat(50));
console.log('Environment:', NODE_ENV);
console.log('Port:', PORT);
console.log('Working directory:', __dirname);
console.log('Process CWD:', process.cwd());
console.log('='.repeat(50));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Request logging with timestamps
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  
  // Log response status when finished
  res.on('finish', () => {
    const statusColor = res.statusCode < 400 ? '✅' : '❌';
    console.log(`[${timestamp}] ${statusColor} ${req.method} ${req.path} → ${res.statusCode}`);
  });
  
  next();
});

// Data directories - ALWAYS use data/static
const STATIC_DIR = path.join(__dirname, 'data', 'static');
const RUNTIME_DIR = path.join(__dirname, 'data', 'runtime');

console.log('Static dir:', STATIC_DIR);
console.log('Runtime dir:', RUNTIME_DIR);

// Data files
const PROGRESS_FILE = path.join(RUNTIME_DIR, 'progress.json');
const QUIZ_FILE = path.join(RUNTIME_DIR, 'quiz-state.json');
const LESSON_CONTENT_FILE = path.join(STATIC_DIR, 'lesson-content.json');
const LESSONS_6_10_FILE = path.join(STATIC_DIR, 'lessons-6-10.json');
const LESSONS_11_15_FILE = path.join(STATIC_DIR, 'lessons-11-15.json');
const LESSONS_16_20_FILE = path.join(STATIC_DIR, 'lessons-16-20.json');
const CHALLENGES_FILE = path.join(STATIC_DIR, 'manning-challenges.json');
const FLASHCARDS_FILE = path.join(STATIC_DIR, 'flashcards.json');
const QUIZ_QUESTIONS_FILE = path.join(STATIC_DIR, 'quiz-questions.json');
const CODE_EXERCISES_FILE = path.join(STATIC_DIR, 'code-exercises.json');

// Initialize data files
function initDataFiles() {
  console.log('\n📁 Initializing data files...');
  
  try {
    // Ensure runtime directory exists
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      console.log('✅ Created runtime directory');
    } else {
      console.log('✅ Runtime directory exists');
    }
    
    // Initialize progress.json
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
    } else {
      console.log('✅ progress.json exists');
    }
    
    // Initialize quiz-state.json
    if (!fs.existsSync(QUIZ_FILE)) {
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
          console.error('⚠️  Failed to load flashcards:', error.message);
          const emptyQuiz = { cards: [], stats: { total: 0, mastered: 0, learning: 0, new: 0 } };
          fs.writeFileSync(QUIZ_FILE, JSON.stringify(emptyQuiz, null, 2));
        }
      } else {
        const emptyQuiz = { cards: [], stats: { total: 0, mastered: 0, learning: 0, new: 0 } };
        fs.writeFileSync(QUIZ_FILE, JSON.stringify(emptyQuiz, null, 2));
        console.log('⚠️  No flashcards found, created empty quiz state');
      }
    } else {
      console.log('✅ quiz-state.json exists');
    }
    
    // Verify static files
    console.log('\n🔍 Verifying static files:');
    const requiredStatic = [
      { file: 'lesson-content.json', path: LESSON_CONTENT_FILE },
      { file: 'flashcards.json', path: FLASHCARDS_FILE },
      { file: 'manning-challenges.json', path: CHALLENGES_FILE }
    ];
    
    let allFilesFound = true;
    requiredStatic.forEach(({ file, path: filePath }) => {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${file}`);
      } else {
        console.error(`❌ MISSING: ${file} at ${filePath}`);
        allFilesFound = false;
      }
    });
    
    if (!allFilesFound) {
      console.error('\n⚠️  Some static files are missing!');
      console.log('Directory contents of', STATIC_DIR);
      if (fs.existsSync(STATIC_DIR)) {
        const files = fs.readdirSync(STATIC_DIR);
        console.log('Files found:', files);
      } else {
        console.log('Directory does not exist!');
      }
    }
    
    console.log('✅ Data initialization complete\n');
  } catch (error) {
    console.error('❌ CRITICAL ERROR in initDataFiles:', error);
    console.error(error.stack);
  }
}

// Initialize on startup
try {
  initDataFiles();
} catch (error) {
  console.error('❌ Fatal error during initialization:', error);
}

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
    return progress.streak;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (progress.lastActive === yesterdayStr) {
    progress.streak += 1;
  } else if (progress.lastActive !== null) {
    progress.streak = 1;
  } else {
    progress.streak = 1;
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

// ROUTES

// Health check for Railway - SIMPLE AND ALWAYS WORKS
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    port: PORT
  });
});

// Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// DEBUG ENDPOINT - Check current state
app.get('/api/debug/state', async (req, res) => {
  try {
    const progress = readJSON(PROGRESS_FILE);
    const lessons = loadAllLessons();
    
    res.json({
      timestamp: new Date().toISOString(),
      progress: {
        completedLessons: progress.completedLessons || [],
        completedCount: (progress.completedLessons || []).length,
        xp: progress.xp || 0,
        streak: progress.streak || 0,
        lastActive: progress.lastActive
      },
      lessons: {
        total: lessons.length,
        available: lessons.map(l => ({
          id: l.id,
          level: l.level,
          title: l.title
        })),
        nextLesson: lessons.find(l => !(progress.completedLessons || []).includes(l.id))
      },
      files: {
        progressFile: PROGRESS_FILE,
        progressExists: fs.existsSync(PROGRESS_FILE),
        lessonFiles: [
          { file: 'lesson-content.json', exists: fs.existsSync(LESSON_CONTENT_FILE) },
          { file: 'lessons-6-10.json', exists: fs.existsSync(LESSONS_6_10_FILE) },
          { file: 'lessons-11-15.json', exists: fs.existsSync(LESSONS_11_15_FILE) },
          { file: 'lessons-16-20.json', exists: fs.existsSync(LESSONS_16_20_FILE) }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
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
    console.error('❌ ERROR in /api/dashboard:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to load dashboard',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Load all lessons from multiple files
function loadAllLessons() {
  let allLessons = [];
  
  // Load lessons 1-5 (foundation)
  if (fs.existsSync(LESSON_CONTENT_FILE)) {
    const lessons1_5 = readJSON(LESSON_CONTENT_FILE);
    allLessons = allLessons.concat(lessons1_5);
  }
  
  // Load lessons 6-10 (core architecture)
  if (fs.existsSync(LESSONS_6_10_FILE)) {
    const lessons6_10 = readJSON(LESSONS_6_10_FILE);
    allLessons = allLessons.concat(lessons6_10);
  }
  
  // Load lessons 11-15 (training)
  if (fs.existsSync(LESSONS_11_15_FILE)) {
    const lessons11_15 = readJSON(LESSONS_11_15_FILE);
    allLessons = allLessons.concat(lessons11_15);
  }
  
  // Load lessons 16-20 (advanced)
  if (fs.existsSync(LESSONS_16_20_FILE)) {
    const lessons16_20 = readJSON(LESSONS_16_20_FILE);
    allLessons = allLessons.concat(lessons16_20);
  }
  
  return allLessons;
}

// Lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = loadAllLessons();
    
    if (lessons.length === 0) {
      console.error('No lessons found!');
      return res.status(404).json({ 
        error: 'No lesson content found'
      });
    }
    
    console.log(`📚 Loaded ${lessons.length} total lessons`);
    res.json(lessons);
  } catch (error) {
    console.error('❌ ERROR in /api/lessons:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to load lessons',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

app.get('/api/lessons/:id', async (req, res) => {
  try {
    const lessons = loadAllLessons();
    const lesson = lessons.find(l => l.id === req.params.id);
    
    if (!lesson) {
      console.error(`Lesson not found: ${req.params.id}`);
      console.log(`Available lessons: ${lessons.map(l => l.id).join(', ')}`);
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
    console.log('\n=== LESSON COMPLETION REQUEST ===');
    console.log('Lesson ID:', req.params.id);
    console.log('Timestamp:', new Date().toISOString());
    
    const progress = readJSON(PROGRESS_FILE);
    console.log('Current progress before completion:', {
      completedLessons: progress.completedLessons || [],
      xp: progress.xp || 0
    });
    
    const lessons = loadAllLessons();
    const lesson = lessons.find(l => l.id === req.params.id);
    
    if (!lesson) {
      console.error('❌ Lesson not found:', req.params.id);
      console.log('Available lessons:', lessons.map(l => l.id).join(', '));
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    console.log('✅ Found lesson:', lesson.title, `(Level ${lesson.level})`);
    
    if (!progress.completedLessons) {
      progress.completedLessons = [];
    }
    
    if (progress.completedLessons.includes(lesson.id)) {
      console.log('⚠️  Lesson already completed');
      return res.json({ 
        message: 'Already completed',
        xp: progress.xp,
        streak: progress.streak,
        completedLessons: progress.completedLessons.length
      });
    }
    
    // Mark as complete
    progress.completedLessons.push(lesson.id);
    progress.xp = (progress.xp || 0) + 100;
    
    console.log('📝 Updating progress:');
    console.log('  - Added to completedLessons:', lesson.id);
    console.log('  - New XP:', progress.xp);
    console.log('  - Total completed:', progress.completedLessons.length);
    
    const newStreak = updateStreak();
    const milestones = checkMilestones(progress.xp);
    
    writeJSON(PROGRESS_FILE, progress);
    console.log('💾 Progress saved to:', PROGRESS_FILE);
    
    // Verify it was saved
    const verifyProgress = readJSON(PROGRESS_FILE);
    console.log('✅ Verified saved progress:', {
      completedLessons: verifyProgress.completedLessons,
      xp: verifyProgress.xp
    });
    
    const response = {
      xp: progress.xp,
      xpGained: 100,
      streak: newStreak,
      milestones,
      completedLessons: progress.completedLessons.length,
      completedLessonIds: progress.completedLessons,
      message: `+100 XP! Total: ${progress.xp}`
    };
    
    console.log('📤 Sending response:', response);
    console.log('=== END COMPLETION ===\n');
    
    res.json(response);
  } catch (error) {
    console.error('❌ ERROR in /api/lessons/:id/complete:', error);
    console.error('Stack:', error.stack);
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

// Quiz endpoints
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
    const { cardId, quality } = req.body;
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

// Quiz questions for lessons
app.get('/api/quiz/:lessonId', async (req, res) => {
  try {
    console.log(`Loading quiz for lesson: ${req.params.lessonId}`);
    
    if (!fs.existsSync(QUIZ_QUESTIONS_FILE)) {
      console.log('⚠️  Quiz questions file not found');
      return res.json({ inLessonQuizzes: [], finalQuiz: null });
    }
    
    const quizzes = readJSON(QUIZ_QUESTIONS_FILE);
    const lessonQuiz = quizzes.find(q => q.lessonId === req.params.lessonId);
    
    if (!lessonQuiz) {
      console.log(`⚠️  No quiz found for lesson ${req.params.lessonId}`);
      return res.json({ inLessonQuizzes: [], finalQuiz: null });
    }
    
    console.log(`✅ Quiz loaded for ${req.params.lessonId}`);
    res.json(lessonQuiz);
  } catch (error) {
    console.error('❌ ERROR in /api/quiz/:lessonId:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to load quiz',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Code exercises for lessons
app.get('/api/code-exercises/:lessonId', async (req, res) => {
  try {
    console.log(`Loading code exercises for lesson: ${req.params.lessonId}`);
    
    if (!fs.existsSync(CODE_EXERCISES_FILE)) {
      console.log('⚠️  Code exercises file not found');
      return res.json({ exercises: [] });
    }
    
    const exercises = readJSON(CODE_EXERCISES_FILE);
    const lessonExercises = exercises.find(e => e.lessonId === req.params.lessonId);
    
    if (!lessonExercises) {
      console.log(`⚠️  No exercises found for lesson ${req.params.lessonId}`);
      return res.json({ exercises: [] });
    }
    
    console.log(`✅ Code exercises loaded for ${req.params.lessonId}`);
    res.json(lessonExercises);
  } catch (error) {
    console.error('❌ ERROR in /api/code-exercises/:lessonId:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to load exercises',
      details: IS_PRODUCTION ? undefined : error.message
    });
  }
});

// Progress
app.get('/api/progress', async (req, res) => {
  try {
    // Force no-cache to prevent stale progress on mobile
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const progress = readJSON(PROGRESS_FILE);
    console.log('📊 Progress requested - completedLessons:', progress.completedLessons || []);
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('✅ SERVER STARTED SUCCESSFULLY');
  console.log('='.repeat(50));
  console.log(`🚀 Running on: http://0.0.0.0:${PORT}`);
  console.log(`💚 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📚 Lessons: http://0.0.0.0:${PORT}/lessons.html`);
  console.log('='.repeat(50));
  
  // Verify critical files
  if (fs.existsSync(LESSON_CONTENT_FILE)) {
    try {
      const lessons = JSON.parse(fs.readFileSync(LESSON_CONTENT_FILE, 'utf8'));
      console.log(`✅ Loaded ${lessons.length} lessons`);
    } catch (e) {
      console.error('❌ Failed to parse lessons:', e.message);
    }
  } else {
    console.error('❌ CRITICAL: lesson-content.json NOT FOUND');
  }
  console.log('='.repeat(50));
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM - shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT - shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
