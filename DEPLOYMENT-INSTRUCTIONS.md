# 🚀 Railway Deployment Instructions

## ✅ Files Fixed

1. **`server-fixed.js`** - Complete rewrite with all fixes applied
2. **`railway.json`** - Railway deployment configuration
3. **`.gitignore`** - Updated for new directory structure
4. **`data/static/`** - All source files moved here
5. **`data/runtime/`** - User progress files (auto-generated)

## 📋 Pre-Deployment Checklist

### Step 1: Replace Server File

```bash
cd learning-accelerator

# Backup old server
mv server.js server-old.js

# Use fixed server
mv server-fixed.js server.js
```

### Step 2: Verify Directory Structure

```bash
# Should see:
data/
├── static/
│   ├── lesson-content.json
│   ├── flashcards.json
│   ├── manning-challenges.json
│   ├── quiz-questions.json
│   └── code-exercises.json
└── runtime/
    └── .gitkeep
```

Run this to verify:
```bash
ls -R data/
```

### Step 3: Test Locally

```bash
npm install
npm start
```

Visit:
- http://localhost:3000 (should load dashboard)
- http://localhost:3000/health (should return JSON with status: "ok")
- http://localhost:3000/lessons.html (should load lessons)

### Step 4: Commit Changes

```bash
git add .
git commit -m "fix: Railway deployment with proper file structure and error handling"
git push origin master
```

## 🌐 Railway Setup

### Step 1: Configure Environment Variables

In Railway dashboard, set:
- `NODE_ENV` = `production`

### Step 2: Configure Volume (Optional but Recommended)

For persistent user progress:
- Mount point: `/app/data/runtime`
- This preserves progress.json and quiz-state.json across deploys

### Step 3: Deploy

Railway should auto-deploy on git push. Monitor logs for:

**Expected Success Logs:**
```
🚀 Starting Learning Accelerator in production mode
📡 Port: 3000
📁 Working directory: /app
✅ Created runtime directory
✅ Initialized progress.json
✅ Initialized 50 flashcards
✅ Found static file: lesson-content.json
✅ Found static file: flashcards.json
✅ Found static file: manning-challenges.json
✅ Loaded 5 lessons from lesson-content.json
🚀 Learning Accelerator running on http://localhost:3000
📚 Lessons available at http://localhost:3000/lessons.html
💚 Health check at http://localhost:3000/health
```

### Step 4: Verify Deployment

Test these endpoints on your Railway URL:

1. **Health Check:** `https://your-app.railway.app/health`
   - Should return: `{"status":"ok", ...}`

2. **Dashboard:** `https://your-app.railway.app/`
   - Should load dashboard UI

3. **Lessons:** `https://your-app.railway.app/lessons.html`
   - Should load lessons page

4. **API:** `https://your-app.railway.app/api/lessons`
   - Should return JSON array of lessons

## 🐛 Troubleshooting

### If Health Check Fails

1. Check Railway logs for errors
2. Verify `data/static/` files are in git
3. SSH into container (if available): `railway shell`
4. Check file structure: `ls -la /app/data`

### If Lessons Don't Load

1. Check browser console for 404 errors
2. Verify `/api/lessons` returns JSON
3. Check Railway logs for "CRITICAL: Missing static file"

### If Progress Doesn't Save

1. Check Railway logs for file write errors
2. Verify `data/runtime/` has write permissions
3. Consider adding Railway volume mount

### If Still Crashing

1. Check Railway logs for stack trace
2. Look for "UNCAUGHT EXCEPTION" or "UNHANDLED REJECTION"
3. File paths might be wrong - verify in logs
4. Check environment variables are set correctly

## 📊 What Changed

### Before (BROKEN):
- Server tried to copy files from `data-source/` to `data/` on startup
- File system was read-only or copy failed
- No health check endpoint
- No error handling
- One error crashed entire app

### After (FIXED):
- All source files in `data/static/` (read-only)
- User data in `data/runtime/` (writable)
- Health check at `/health`
- Global error handlers prevent crashes
- Proper logging for debugging
- Try-catch on all routes
- Environment-aware configuration

## ✅ Success Criteria

Your deployment is successful when:

- [ ] `/health` returns 200 OK
- [ ] Dashboard loads without errors
- [ ] Lessons page loads all 5 lessons
- [ ] Completing a lesson saves XP
- [ ] Refreshing page preserves progress
- [ ] No errors in Railway logs

## 🆘 Need Help?

If deployment still fails after following this guide:

1. Copy full Railway logs
2. Share the specific error message
3. Verify all files from "Pre-Deployment Checklist" exist
4. Check git commit includes `data/static/` files

---

**Ready to deploy!** Follow steps in order and monitor logs carefully.
