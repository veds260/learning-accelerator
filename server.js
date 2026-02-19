const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data files
const PROGRESS_FILE = path.join(__dirname, 'data', 'progress.json');
const QUIZ_FILE = path.join(__dirname, 'data', 'quiz-state.json');
const CHALLENGES_FILE = path.join(__dirname, 'data', 'challenges.json');
const MANNING_CHALLENGES_FILE = path.join(__dirname, 'data', 'manning-challenges.json');
const FLASHCARDS_FILE = path.join(__dirname, 'data', 'flashcards.json');
const LESSON_CONTENT_FILE = path.join(__dirname, 'data', 'lesson-content.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize data files if they don't exist
function initDataFiles() {
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
  }

  if (!fs.existsSync(QUIZ_FILE)) {
    let initialQuiz;
    
    // Try to load Manning flashcards
    if (fs.existsSync(FLASHCARDS_FILE)) {
      const flashcardsData = JSON.parse(fs.readFileSync(FLASHCARDS_FILE, 'utf8'));
      // Initialize cards with SM-2 algorithm defaults
      initialQuiz = {
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
      console.log(`✅ Loaded ${flashcardsData.cards.length} Manning flashcards`);
    } else {
      initialQuiz = {
        cards: [],
        stats: { total: 0, mastered: 0, learning: 0, new: 0 }
      };
    }
    fs.writeFileSync(QUIZ_FILE, JSON.stringify(initialQuiz, null, 2));
  }

  // Load Manning challenges if available, otherwise use defaults
  if (!fs.existsSync(CHALLENGES_FILE)) {
    let challenges;
    
    // Try to load Manning challenges first
    if (fs.existsSync(MANNING_CHALLENGES_FILE)) {
      challenges = JSON.parse(fs.readFileSync(MANNING_CHALLENGES_FILE, 'utf8'));
      console.log('✅ Loaded Manning LLM challenges');
    } else {
      // Fallback to default challenges
      console.log('⚠️  Manning challenges not found, using defaults');
      challenges = [
      {
        id: 'tokenization',
        title: 'Build a Mini Tokenizer',
        description: 'Understand how LLMs break down text into tokens',
        timeEstimate: '2-3 hours',
        xp: 50,
        tier: 'foundation',
        tasks: [
          'Build byte-pair encoding tokenizer',
          'Test on sample text',
          'Measure compression ratio',
          'Compare with GPT tokenizer'
        ],
        winCondition: 'Tokenizer works on any text, outputs token count + IDs'
      },
      {
        id: 'embeddings',
        title: 'Build Semantic Search for Fathom',
        description: 'Search your call transcripts by meaning, not keywords',
        timeEstimate: '3-4 hours',
        xp: 75,
        tier: 'foundation',
        tasks: [
          'Generate embeddings for call transcripts',
          'Build search interface',
          'Test queries',
          'Deploy to tools/'
        ],
        winCondition: 'Search "hiring discussions" and get relevant calls, not keyword matches'
      },
      {
        id: 'attention',
        title: 'Visualize Attention on Your Content',
        description: 'See what LLMs focus on when reading Luca posts',
        timeEstimate: '3-4 hours',
        xp: 75,
        tier: 'foundation',
        tasks: [
          'Extract attention weights from model',
          'Build visualization (heatmap)',
          'Test on Luca content',
          'Find patterns'
        ],
        winCondition: 'Interactive heatmap showing attention on any post'
      },
      {
        id: 'finetuning',
        title: 'Fine-tune Model on Luca Voice',
        description: 'Train a model to write like Luca',
        timeEstimate: '4-5 hours',
        xp: 100,
        tier: 'intermediate',
        tasks: [
          'Prepare training dataset (Luca posts)',
          'Fine-tune small model (GPT-2 or similar)',
          'Test generation quality',
          'Compare with base model'
        ],
        winCondition: 'Model generates Luca-style posts that pass AI detection'
      },
      {
        id: 'prompting',
        title: 'Build Prompt Testing Framework',
        description: 'A/B test prompts with real metrics',
        timeEstimate: '3-4 hours',
        xp: 75,
        tier: 'intermediate',
        tasks: [
          'Build test harness',
          'Run prompts through models',
          'Score outputs (AI detection, voice match)',
          'Generate comparison report'
        ],
        winCondition: 'Tool shows which prompt variant performs best for client content'
      },
      {
        id: 'multimodal',
        title: 'Build Clip Scorer for ClipYard',
        description: 'AI that watches clips and scores them',
        timeEstimate: '4-5 hours',
        xp: 100,
        tier: 'advanced',
        tasks: [
          'Extract frames + audio from clips',
          'Feed to multimodal model (GPT-4V or Gemini)',
          'Score on hook/pacing/completeness',
          'Build API endpoint'
        ],
        winCondition: 'Tool scores clips with 80%+ accuracy vs human judgment'
      },
      {
        id: 'orchestration',
        title: 'Build Multi-Model Router',
        description: 'Smart system that picks the right model for each task',
        timeEstimate: '4-5 hours',
        xp: 100,
        tier: 'advanced',
        tasks: [
          'Define routing rules (task type → model)',
          'Build fallback logic',
          'Track cost/performance',
          'Deploy for real workflows'
        ],
        winCondition: 'System saves 30%+ on API costs while maintaining quality'
      }
    ];
    }
    fs.writeFileSync(CHALLENGES_FILE, JSON.stringify(challenges, null, 2));
  }

  // Initialize flashcards from flashcards.json if available
  if (!fs.existsSync(QUIZ_FILE) && fs.existsSync(FLASHCARDS_FILE)) {
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
      stats: {
        total: flashcardsData.cards.length,
        mastered: 0,
        learning: 0,
        new: flashcardsData.cards.length
      }
    };
    fs.writeFileSync(QUIZ_FILE, JSON.stringify(initialQuiz, null, 2));
  }
}

initDataFiles();

// Helper functions
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
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

// API Routes

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const progress = readJSON(PROGRESS_FILE);
  const quiz = readJSON(QUIZ_FILE);
  const challenges = readJSON(CHALLENGES_FILE);
  
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
});

// Challenges
app.get('/api/challenges', (req, res) => {
  const challenges = readJSON(CHALLENGES_FILE);
  const progress = readJSON(PROGRESS_FILE);
  
  const enrichedChallenges = challenges.map(c => ({
    ...c,
    completed: progress.completedSkills.includes(c.id)
  }));
  
  res.json(enrichedChallenges);
});

app.get('/api/challenges/:id', (req, res) => {
  const challenges = readJSON(CHALLENGES_FILE);
  const challenge = challenges.find(c => c.id === req.params.id);
  
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }
  
  res.json(challenge);
});

app.post('/api/challenges/:id/complete', (req, res) => {
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
});

// Quiz
app.get('/api/quiz/cards', (req, res) => {
  const quiz = readJSON(QUIZ_FILE);
  res.json(quiz.cards);
});

app.get('/api/quiz/due', (req, res) => {
  const quiz = readJSON(QUIZ_FILE);
  const dueCards = quiz.cards.filter(card => {
    if (!card.nextReview) return true;
    return new Date(card.nextReview) <= new Date();
  });
  
  res.json(dueCards);
});

app.post('/api/quiz/review', (req, res) => {
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
});

app.post('/api/quiz/add', (req, res) => {
  const { front, back, concept } = req.body;
  const quiz = readJSON(QUIZ_FILE);
  
  const newCard = {
    id: Date.now().toString(),
    front,
    back,
    concept,
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReview: new Date().toISOString(),
    created: new Date().toISOString()
  };
  
  quiz.cards.push(newCard);
  writeJSON(QUIZ_FILE, quiz);
  
  res.json({ message: 'Card added', card: newCard });
});

// Progress
app.get('/api/progress', (req, res) => {
  const progress = readJSON(PROGRESS_FILE);
  const challenges = readJSON(CHALLENGES_FILE);
  
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
});

// Teach Back
app.post('/api/teachback/submit', (req, res) => {
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
});

// Stats
app.get('/api/stats', (req, res) => {
  const progress = readJSON(PROGRESS_FILE);
  const quiz = readJSON(QUIZ_FILE);
  const challenges = readJSON(CHALLENGES_FILE);
  
  res.json({
    totalXP: progress.xp,
    currentStreak: progress.streak,
    skillsCompleted: progress.completedSkills.length,
    totalSkills: challenges.length,
    cardsTotal: quiz.cards.length,
    milestones: checkMilestones(progress.xp)
  });
});

// Lessons API
app.get('/api/lessons', (req, res) => {
  try {
    if (!fs.existsSync(LESSON_CONTENT_FILE)) {
      return res.status(404).json({ error: 'Lesson content not found' });
    }
    const lessons = readJSON(LESSON_CONTENT_FILE);
    res.json(lessons);
  } catch (error) {
    console.error('Error loading lessons:', error);
    res.status(500).json({ error: 'Failed to load lessons' });
  }
});

app.get('/api/lessons/:id', (req, res) => {
  try {
    const lessons = readJSON(LESSON_CONTENT_FILE);
    const lesson = lessons.find(l => l.id === req.params.id);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    res.json(lesson);
  } catch (error) {
    console.error('Error loading lesson:', error);
    res.status(500).json({ error: 'Failed to load lesson' });
  }
});

app.post('/api/lessons/:id/complete', (req, res) => {
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
    console.error('Error completing lesson:', error);
    res.status(500).json({ error: 'Failed to complete lesson' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Learning Accelerator running on http://localhost:${PORT}`);
  console.log(`📚 Lessons available at http://localhost:${PORT}/lessons.html`);
});
