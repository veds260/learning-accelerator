# Mobile Responsive Design - TODO

## Priority: Complete before Ved wakes up

### Issues to Fix

1. **Lesson Detail Page**
   - Progress bar too wide on mobile
   - Content sections need better padding
   - Buttons too small to tap
   - Code editor needs mobile alternative

2. **Quiz**
   - Option buttons need larger tap targets (min 44px)
   - Question text too small
   - Spacing between options too tight

3. **Code Exercise**
   - Monaco editor doesn't work well on small screens
   - Need textarea fallback for mobile
   - Console output needs scrolling
   - Run button needs to be bigger

4. **Navigation**
   - Nav menu needs hamburger on mobile
   - Links stacked vertically
   - Logo/brand stays visible

5. **Dashboard**
   - Stats grid needs to stack on mobile
   - Action buttons need better spacing
   - Card layouts need to be responsive

6. **General**
   - Font sizes need to scale
   - Line heights need adjustment
   - Padding/margins need mobile values
   - Touch targets minimum 44x44px
   - Horizontal scrolling eliminated

### Implementation Plan

1. Add mobile-first media queries to lesson-detail.css
2. Update lessons.css for mobile
3. Update style.css (dashboard) for mobile
4. Add mobile detection for code editor (textarea fallback)
5. Test on iPhone/Android viewport sizes

### Testing Viewports
- iPhone SE: 375x667
- iPhone 12: 390x844
- Android (common): 360x640

Status: Starting now...
