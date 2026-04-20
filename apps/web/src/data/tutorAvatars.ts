export interface TutorAvatar {
  id: string;
  name: string;
  tagline: string;
  url: string;
  color: string; // Tailwind bg color for the ring/badge
}

export const TUTOR_AVATARS: TutorAvatar[] = [
  {
    id: 'ayu',
    name: 'Ayu',
    tagline: 'Warm & encouraging',
    url: '/avatars/ayu.png',
    color: 'bg-blue-400',
  },
  {
    id: 'sara',
    name: 'Ms. Sara',
    tagline: 'Patient & supportive',
    url: '/avatars/sara.png',
    color: 'bg-rose-400',
  },
  {
    id: 'rajan',
    name: 'Mr. Rajan',
    tagline: 'Enthusiastic step-by-step',
    url: '/avatars/rajan.png',
    color: 'bg-violet-400',
  },
  {
    id: 'chen',
    name: 'Dr. Chen',
    tagline: 'Precise & methodical',
    url: '/avatars/chen.png',
    color: 'bg-indigo-400',
  },
  {
    id: 'alex',
    name: 'Alex',
    tagline: 'Quick & direct',
    url: '/avatars/alex.png',
    color: 'bg-emerald-400',
  },
  {
    id: 'maya',
    name: 'Maya',
    tagline: 'Creative problem solver',
    url: '/avatars/maya.png',
    color: 'bg-amber-400',
  },
];

export const DEFAULT_AVATAR = TUTOR_AVATARS[0];
