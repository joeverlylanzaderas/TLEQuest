// mobile/src/legal/legalContent.ts
// Terms & Conditions and Privacy Policy shown in the app.
//
// IMPORTANT
//  - POLICY_VERSION must match POLICY_VERSION in backend/apps/accounts/models.py.
//    Change BOTH when the text changes: everyone is then asked to agree again.
//  - Fill in the [bracketed] items (school, contact) before release, and have your adviser / the
//    school's Data Protection Officer read this once. It is written to follow the Philippine Data
//    Privacy Act of 2012 (RA 10173) but it is not legal advice.

export const POLICY_VERSION = '2026-11-16';
export const APP_NAME = 'TLEQuest';
export const EFFECTIVE_DATE = 'November 16, 2026';
export const CONTACT_NAME = '[Name of the TLEQuest developer / adviser]';
export const CONTACT_EMAIL = '[contact email]';
export const SCHOOL_NAME = '[Name of the school]';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS: LegalDoc = {
  title: 'Terms and Conditions',
  intro: `These terms explain how to use ${APP_NAME}, a learning app for Technology and Livelihood Education (TLE) table setting. By using the app you agree to them.`,
  sections: [
    {
      heading: '1. What the app is for',
      paragraphs: [
        `${APP_NAME} is a supplementary learning tool. It gives quests, step-by-step checklists, points and badges to help students practice table setting. It does not replace your teacher or your class lessons.`,
      ],
    },
    {
      heading: '2. Your account',
      paragraphs: [
        'Your account is created by your school or teacher. It is only for you. Keep your password private and do not let others use your account.',
        'Tell your teacher if you think someone else is using your account. Change your password from the app if you need to.',
      ],
    },
    {
      heading: '3. What you may do',
      paragraphs: [
        'Use the app for your TLE lessons and be respectful. Only submit photos of your own group\'s real work.',
        'Do not upload photos of people\'s faces or of anything that is private, harmful or not related to the quest. Do not try to cheat the system, break the app or look into other people\'s accounts.',
      ],
    },
    {
      heading: '4. Photos and AI checking',
      paragraphs: [
        'Your group leader submits one photo of the finished table setting. A computer model on the phone gives a quick AI check (Accepted or For Review). The AI is only a helper and it can be wrong.',
        'Your teacher always makes the final decision about your submission, points and badges.',
      ],
    },
    {
      heading: '5. Points, badges and ratings',
      paragraphs: [
        'Points and badges are for motivation and practice. Your teacher\'s review and your class grading rules decide your actual grade.',
      ],
    },
    {
      heading: '6. Teachers',
      paragraphs: [
        'Teachers are responsible for the classes and quests they create, and for reviewing student work fairly. Teachers may only use student information for teaching and class management.',
      ],
    },
    {
      heading: '7. When things go wrong',
      paragraphs: [
        `We try to keep ${APP_NAME} working, but it may sometimes be offline, slow or have mistakes. It is provided as it is for learning purposes. We may suspend an account that is used against these terms.`,
      ],
    },
    {
      heading: '8. Changes',
      paragraphs: [
        'We may update these terms. When we do, the app will ask you to read and agree again before you continue.',
      ],
    },
    {
      heading: '9. Contact',
      paragraphs: [`Questions? Contact ${CONTACT_NAME} at ${CONTACT_EMAIL}, or your teacher.`],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  intro: `${APP_NAME} respects your privacy and follows the Data Privacy Act of 2012 (Republic Act No. 10173). This page explains what we collect, why, and what your rights are. Effective ${EFFECTIVE_DATE}.`,
  sections: [
    {
      heading: '1. What we collect',
      paragraphs: [
        'Account details: username, your name, email (if given), school, grade level and section, and an optional profile picture.',
        'Learning activity: the classes and groups you join, quest progress, ticked checklist items, points, badges and notifications.',
        'Submissions: the photo your group submits, the AI result and confidence, and your teacher\'s rating and feedback.',
        'Technical data: login times and the network address used to log in, kept for security. We do not collect your location, contacts or microphone recordings.',
      ],
    },
    {
      heading: '2. Why we collect it',
      paragraphs: [
        'To run your classes and quests, show your progress, let teachers review submissions, keep accounts secure, and measure whether the app helps learning for our research study.',
        'We only collect what is needed for these purposes.',
      ],
    },
    {
      heading: '3. Who can see it',
      paragraphs: [
        'Your teacher and the administrators of the app can see your account details, progress and submissions. Group members can see their group\'s submission. Other students cannot see your personal details.',
        'We do not sell your data and we do not use it for advertising. We do not share it with anyone else, except where the law requires it.',
        'Results of the research study are reported as summaries without names.',
      ],
    },
    {
      heading: '4. Photos and the AI',
      paragraphs: [
        'The AI check runs on your phone. The photo is then sent to our server so your teacher can review it. Please take photos of the table setting only, and avoid showing faces or other people.',
      ],
    },
    {
      heading: '5. Where it is stored and for how long',
      paragraphs: [
        'Data is stored on secure cloud servers and the app uses encrypted connections (HTTPS). Passwords are stored in a protected form, never as plain text.',
        'We keep your data while your account is active and for the school term needed for grading and the research study. After that it is deleted or made anonymous, unless your school needs it longer.',
      ],
    },
    {
      heading: '6. Students under 18',
      paragraphs: [
        `Many users are minors. ${SCHOOL_NAME} and your teacher introduce the app in class, and your parent or guardian may ask your teacher about how your data is used. If you are under 18, please read this together with them.`,
      ],
    },
    {
      heading: '7. Your rights',
      paragraphs: [
        'You have the right to be informed, to access your data, to correct wrong data, to object, to ask for your data to be removed, and to file a complaint with the National Privacy Commission (privacy.gov.ph).',
        `To use these rights, tell your teacher or contact ${CONTACT_NAME} at ${CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '8. Security',
      paragraphs: [
        'We use logins, limited access by role, encrypted connections and regular backups. No system is perfect. If there is a data breach that affects you, we will tell you and the authorities as the law requires.',
      ],
    },
    {
      heading: '9. Changes',
      paragraphs: [
        'If this policy changes, the app will ask you to read and agree again.',
      ],
    },
  ],
};
