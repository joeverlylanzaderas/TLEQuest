// mobile/src/components/CoachContent.ts
// All the words for the teacher's guided tour and the first-visit tips.
// Edit the text here; CoachTour.tsx reads from this file.
//
// A step with `target` lights up that part of the screen (the id is set in the screen with
// `target('id')`). A step without `target` is a plain card in the middle of the screen.
// A step with `route` first opens that screen.

export interface CoachStep {
  target?: string;
  route?: string;
  title: string;
  body: string;
}

export interface CoachTourDef {
  /** 'tour' = the full walk-through (Skip ends it). 'tips' = a short first-visit tip for one screen. */
  kind: 'tour' | 'tips';
  steps: CoachStep[];
}

export const MAIN_TOUR_ID = 'teacher-main';

// Screens the full tour visits (a step with `route` opens that screen first)
const R_HOME = '/(teacher)/(tabs)/dashboard';
const R_REVIEW = '/(teacher)/(tabs)/submissions';
const R_QUESTS = '/(teacher)/(tabs)/quests';
const R_PROGRESS = '/(teacher)/(tabs)/progress';
const R_CLASSES = '/(teacher)/(tabs)/classes';

/** The full tour already explains these screens, so finishing it hides their first-visit tips. */
export const TIPS_COVERED_BY_MAIN_TOUR = ['teacher-review', 'teacher-quests', 'teacher-classes'];

export const COACH_TOURS: Record<string, CoachTourDef> = {
  // ------------------------------------------------------------- the full guided tour
  [MAIN_TOUR_ID]: {
    kind: 'tour',
    steps: [
      // ---- Home
      { route: R_HOME, title: 'Welcome, Teacher!', body: 'This tour walks you through every screen, one at a time. It takes a few minutes. You can tap Skip at any time, and see it again from Settings.' },
      { route: R_HOME, target: 'tab-dashboard', title: 'Home', body: 'Your starting point. It shows what needs you today.' },
      { route: R_HOME, target: 'home-hero', title: 'What needs you', body: 'This card tells you how many photos are waiting for your review. Tap "Review now" to open them.' },
      { route: R_HOME, target: 'home-stats', title: 'Quick numbers', body: 'How many students, classes, quests and groups you have.' },
      { route: R_HOME, target: 'home-actions', title: 'Shortcuts', body: 'Make a new quest, open your classes, or see all submissions with one tap.' },

      // ---- Review
      { route: R_REVIEW, target: 'tab-submissions', title: 'Review', body: 'When a group sends a photo of its finished work, it shows up here.' },
      { route: R_REVIEW, target: 'review-tabs', title: 'To review, Done, All', body: '"To review" shows the photos waiting for you. After you send your feedback, a photo moves to "Done".' },
      { route: R_REVIEW, target: 'review-search', title: 'Find a group fast', body: 'Type a group, quest or student name. Tap "Filter" to pick a class or a group.' },
      { route: R_REVIEW, target: 'review-first', title: 'Open a photo', body: 'Tap a card to see the photo, the AI hint and the group members. Then rate it, add a note, and tap "Send review". The group gets your feedback and their points and badge.' },

      // ---- Quests
      { route: R_QUESTS, target: 'tab-quests', title: 'Quests', body: 'Your quests live here: the activities you give to your students.' },
      { route: R_QUESTS, target: 'quests-new', title: 'Make a new quest', body: 'Tap "New quest". You will add the steps, the points and the badge, then choose who gets it.' },
      { route: R_QUESTS, target: 'quests-first', title: 'Your quests', body: 'Tap a quest to see its details, change it, or check who has finished.' },

      // ---- Progress
      { route: R_PROGRESS, target: 'tab-progress', title: 'Progress', body: 'See how far each group has gone in a quest, and who is still working.' },

      // ---- Classes
      { route: R_CLASSES, target: 'tab-classes', title: 'Classes', body: 'Your classes, students and groups.' },
      { route: R_CLASSES, target: 'classes-new', title: 'Make a class', body: 'Tap "New class" and give it a name. Then share the invite code with your students so they can join.' },
      { route: R_CLASSES, target: 'classes-first', title: 'Your classes', body: 'Tap a class to see its students. Tap "Open" to manage its groups and quests.' },

      // ---- Header
      { route: R_CLASSES, target: 'header-avatar', title: 'Your picture = Settings', body: 'Tap your picture any time to open Settings. You can edit your profile, change your password, change the colors, or sign out.' },
      { route: R_CLASSES, target: 'header-bell', title: 'Notifications', body: 'The bell tells you when something new happens, like a group sending its photo. A red dot means something is new.' },

      { route: R_HOME, title: "You're ready!", body: 'You can see this tour again any time: open Settings and tap "Guided tour". Tip: the "How it works" page in Settings has pictures of the main steps.' },
    ],
  },

  // ------------------------------------------------------------- first-visit tips, one per screen
  'teacher-review': {
    kind: 'tips',
    steps: [
      {
        target: 'review-tabs',
        title: 'To review, Done, All',
        body: '"To review" shows the photos waiting for you. After you send your feedback, a photo moves to "Done".',
      },
      {
        target: 'review-search',
        title: 'Find a group fast',
        body: 'Type a group, quest or student name. Tap "Filter" to pick a class or a group.',
      },
      {
        target: 'review-first',
        title: 'Open a photo',
        body: 'Tap a card to see the photo, the AI hint and the group members. Then send your review.',
      },
    ],
  },
  'teacher-review-detail': {
    kind: 'tips',
    steps: [
      {
        target: 'detail-ai',
        title: 'The AI hint',
        body: 'The AI gives a first opinion and a confidence score. It can be wrong. You make the final decision.',
      },
      {
        target: 'detail-rating',
        title: 'Give your review',
        body: 'Tap the stars to rate. Tap a quick note, or type your own. Both are optional.',
      },
      {
        title: 'Send it',
        body: 'Scroll down and tap "Send review". The group gets your feedback, and their points and badge are released.',
      },
    ],
  },
  'teacher-quests': {
    kind: 'tips',
    steps: [
      {
        target: 'quests-new',
        title: 'Make a new quest',
        body: 'Tap "New quest". You will add the steps, the points and the badge, then choose who gets it.',
      },
      {
        target: 'quests-first',
        title: 'Your quests',
        body: 'Tap a quest to see its details, change it, or check who has finished.',
      },
    ],
  },
  'teacher-classes': {
    kind: 'tips',
    steps: [
      {
        target: 'classes-new',
        title: 'Make a class',
        body: 'Tap "New class" and give it a name. Then share the invite code with your students.',
      },
      {
        target: 'classes-first',
        title: 'Your classes',
        body: 'Tap a class to see its students. Tap "Open" to manage its groups and quests.',
      },
    ],
  },
};

/** The tours that "Show tips again" forgets. */
export const ALL_TOUR_IDS = Object.keys(COACH_TOURS);
