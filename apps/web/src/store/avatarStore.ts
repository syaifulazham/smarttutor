import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TUTOR_AVATARS, DEFAULT_AVATAR, type TutorAvatar } from '@/data/tutorAvatars';

interface AvatarStore {
  selectedId: string;
  avatar: TutorAvatar;
  setAvatar: (id: string) => void;
}

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set) => ({
      selectedId: DEFAULT_AVATAR.id,
      avatar: DEFAULT_AVATAR,
      setAvatar: (id) => {
        const found = TUTOR_AVATARS.find((a) => a.id === id) ?? DEFAULT_AVATAR;
        set({ selectedId: id, avatar: found });
      },
    }),
    { name: 'tutor-avatar' }
  )
);
