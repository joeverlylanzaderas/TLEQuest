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

export type CoachRole = 'teacher' | 'student';

export const MAIN_TOUR_IDS: Record<CoachRole, string> = {
  teacher: 'teacher-main',
  student: 'student-main',
};
/** Kept for older imports: the teacher's full tour. */
export const MAIN_TOUR_ID = MAIN_TOUR_IDS.teacher;

// Screens the full tours visit (a step with `route` opens that screen first)
const R_HOME = '/(teacher)/(tabs)/dashboard';
const R_REVIEW = '/(teacher)/(tabs)/submissions';
const R_QUESTS = '/(teacher)/(tabs)/quests';
const R_PROGRESS = '/(teacher)/(tabs)/progress';
const R_CLASSES = '/(teacher)/(tabs)/classes';

const S_HOME = '/(student)/(tabs)/home';
const S_QUESTS = '/(student)/(tabs)/quests';
const S_SUBS = '/(student)/(tabs)/submissions';
const S_PROGRESS = '/(student)/(tabs)/progress';
const S_PROFILE = '/(student)/(tabs)/profile';

/** The full tour already explains these screens, so finishing it hides their first-visit tips. */
export const TIPS_COVERED_BY_MAIN_TOUR: Record<CoachRole, string[]> = {
  teacher: ['teacher-review', 'teacher-quests', 'teacher-classes'],
  student: ['student-quests'],
};

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

  // ============================================================= STUDENT
  [MAIN_TOUR_IDS.student]: {
    kind: 'tour',
    steps: [
      { route: S_HOME, title: 'Welcome to TLEQuest!', body: 'Finish quests, earn points and collect badges. This quick tour shows you where everything is. You can tap Skip at any time.' },
      { route: S_HOME, target: 'tab-home', title: 'Home', body: 'Your starting place. You see your current quest, your points and your badges.' },
      { route: S_HOME, target: 'home-quest', title: 'Your current quest', body: 'Tap this card to open your quest. "Continue" takes you to the step where you stopped.' },
      { route: S_HOME, target: 'home-stats', title: 'Points and badges', body: 'The points and badges you earned, and how many quests you finished.' },

      { route: S_QUESTS, target: 'tab-quests', title: 'Quests', body: 'All the quests from your teacher are here. Tap a quest to see its steps.' },
      { route: S_QUESTS, target: 'quests-toggle', title: 'Map or List', body: 'See your quests as a road map or as a simple list. Pick the one you like.' },
      { route: S_QUESTS, title: 'How to finish a quest', body: '1. Open a quest.\n2. Do the steps in order and tick every box in the checklist.\n3. After the last step, your group leader takes a photo of your finished work.\n4. Your teacher checks it and gives you points and badges.' },

      { route: S_SUBS, target: 'tab-submissions', title: 'Submissions', body: 'The photo your group sent, the AI check, and your teacher\'s feedback show up here.' },
      { route: S_PROGRESS, target: 'tab-progress', title: 'Progress', body: 'Your points and badges, and how far you are in each quest.' },
      { route: S_PROFILE, target: 'tab-profile', title: 'Profile', body: 'Your information, the colors of the app, and help. You can see this tour again here.' },

      { route: S_HOME, target: 'header-avatar', title: 'Your picture', body: 'Tap your picture any time to open your profile.' },
      { route: S_HOME, target: 'header-bell', title: 'Notifications', body: 'The bell tells you when your teacher sends feedback or something new happens. A red dot means something is new.' },

      { route: S_HOME, title: "You're ready!", body: 'You can see this tour again any time: open Profile and tap "Guided tour". You will also see a short tip the first time you open a quest, a step, and the camera.' },
    ],
  },

  'student-quests': {
    kind: 'tips',
    steps: [
      { target: 'quests-toggle', title: 'Map or List', body: 'See your quests as a road map or as a simple list. Tap a quest to open it.' },
    ],
  },
  'student-overview': {
    kind: 'tips',
    steps: [
      { target: 'overview-first', title: 'Do the steps in order', body: 'Tap a step to open its checklist. A locked step opens after you finish the step before it.' },
    ],
  },
  'student-step': {
    kind: 'tips',
    steps: [
      { target: 'step-checklist', title: 'Tick the checklist', body: 'Do each thing, then tap its box. Tap all the boxes to finish the step.' },
      { target: 'step-proceed', title: 'Go to the next step', body: 'This button turns on when every box is ticked. Tap it to move on.' },
    ],
  },
  'student-submit': {
    kind: 'tips',
    steps: [
      { target: 'submit-card', title: 'Send your photo', body: 'Only the group leader sends the photo. Take one clear photo of your finished work in good light, check it, then tap "Submit Now". A group can send only one photo, so make it a good one.' },
    ],
  },
};

/** The tours that belong to a role ("Show tips again" forgets these). */
export function tourIdsFor(role: CoachRole): string[] {
  return Object.keys(COACH_TOURS).filter((id) => id.startsWith(`${role}-`));
}

/** Kept for older imports. */
export const ALL_TOUR_IDS = tourIdsFor('teacher');
