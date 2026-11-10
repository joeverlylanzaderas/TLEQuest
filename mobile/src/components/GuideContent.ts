// mobile/src/components/GuideContent.ts
// All the words for the welcome guide and the "How it works" help.
// Edit the text here; the screens read from this file.
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type GuideRole = 'student' | 'teacher';
type IconName = ComponentProps<typeof Ionicons>['name'];

export type TileColor = 'gold' | 'brown' | 'blue' | 'green';

export interface WelcomeSlide {
  icon: IconName;
  color: TileColor;
  title: string;
  body: string;
}

// Option A: the pop-up shown once after the first login
export const WELCOME: Record<GuideRole, WelcomeSlide[]> = {
  student: [
    { icon: 'star-outline', color: 'gold', title: 'Welcome to TLEQuest!', body: 'Learn Home Economics by finishing quests. This quick tour shows you how to use the app, step by step.' },
    { icon: 'list-outline', color: 'brown', title: '1. Open your quest', body: 'Go to the Quests tab and tap a quest. You will see its steps. Do them in order, one at a time.' },
    { icon: 'checkbox-outline', color: 'green', title: '2. Tick the checklist', body: 'Each step has a checklist. Tap every box when you have done it. Then tap "Proceed to Next Step".' },
    { icon: 'camera-outline', color: 'blue', title: '3. Take a photo', body: 'After the last step, tap "Take a Photo". Allow the camera when your phone asks. Put your whole finished work in the picture, in good light, then tap the round button.' },
    { icon: 'cloud-upload-outline', color: 'brown', title: '4. Check and submit', body: 'Look at your photo. Not clear? Tap "Retake". Happy with it? Tap "Submit Now".' },
    { icon: 'ribbon-outline', color: 'gold', title: 'Points and badges', body: 'Your teacher checks your photo. When it is approved you get points and badges. See them in Progress. In a group, only the group leader sends the photo.' },
  ],
  teacher: [
    { icon: 'star-outline', color: 'gold', title: 'Welcome to TLEQuest!', body: 'Set up your class and quests in a few taps. Here is a quick tour.' },
    { icon: 'people-outline', color: 'blue', title: 'Create your class', body: 'Make a class, share the invite code, and students join by themselves.' },
    { icon: 'list-outline', color: 'brown', title: 'Build quests with steps', body: 'Add steps, points and badges. Give a quest to the whole class or to groups.' },
    { icon: 'file-tray-full-outline', color: 'green', title: 'Review in one tap', body: 'Open a submission, check the photo and the AI hint, then approve or ask to redo.' },
  ],
};

// Option C: the illustrated "How it works" pages (2 pictures per page)
export type HelpScene =
  | 'tapQuest' | 'oneStep'
  | 'tickChecklist' | 'unlockNext'
  | 'allDone' | 'allowCamera'
  | 'frame' | 'camera' | 'retake'
  | 'submitNow' | 'leader'
  | 'teacherChecks' | 'rewards'
  | 'classCode' | 'joinByCode'
  | 'questSteps' | 'assignTo'
  | 'checkPhoto' | 'decide';

export interface HelpItem {
  scene: HelpScene;
  caption: string;
}

export const HELP_PAGES: Record<GuideRole, HelpItem[][]> = {
  student: [
    [
      { scene: 'tapQuest', caption: 'Open the Quests tab and tap a quest' },
      { scene: 'oneStep', caption: 'Do the steps in order, one at a time' },
    ],
    [
      { scene: 'tickChecklist', caption: 'Tap each box in the checklist when it is done' },
      { scene: 'unlockNext', caption: 'All boxes ticked? Tap "Proceed to Next Step"' },
    ],
    [
      { scene: 'allDone', caption: 'After the last step you will see "All Steps Completed!"' },
      { scene: 'allowCamera', caption: 'Tap "Take a Photo". If your phone asks, tap Allow for the camera' },
    ],
    [
      { scene: 'frame', caption: 'Camera tip: put your whole finished work in the picture' },
      { scene: 'camera', caption: 'Use good light and hold your phone steady, then tap the round button' },
    ],
    [
      { scene: 'retake', caption: 'Check your photo. Blurry or cut off? Tap "Retake"' },
      { scene: 'submitNow', caption: 'Looks good? Tap "Submit Now" and wait a few seconds' },
    ],
    [
      { scene: 'leader', caption: 'In a group, only the group leader takes and sends the photo' },
      { scene: 'teacherChecks', caption: 'Your teacher checks your photo' },
    ],
    [
      { scene: 'rewards', caption: 'Approved! You earn points and collect badges' },
    ],
  ],
  teacher: [
    [
      { scene: 'classCode', caption: 'Make a class and share the invite code' },
      { scene: 'joinByCode', caption: 'Students join by typing the code' },
    ],
    [
      { scene: 'questSteps', caption: 'Add steps, points and badges' },
      { scene: 'assignTo', caption: 'Give the quest to the whole class or to groups' },
    ],
    [
      { scene: 'checkPhoto', caption: 'Open a submission and check the photo' },
      { scene: 'decide', caption: 'Approve it or ask to redo' },
    ],
  ],
};
