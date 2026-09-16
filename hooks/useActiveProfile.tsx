import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { ChildProfile } from "@/types/user";
import { Locale } from "@/types/common";
import { ProfileService } from "@/storage/services/profileService";
import { ChildProfileRepository } from "@/storage/repositories/childProfileRepository";

interface ProfileContextValue {
  activeProfile: ChildProfile | null;
  profiles: ChildProfile[];
  isLoading: boolean;
  refreshProfiles: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  updateNickname: (newNickname: string) => Promise<void>;
  updateAvatar: (newAvatarId: string) => Promise<void>;
  updateLanguage: (newLanguage: Locale) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
}

/**
 * Global Profile Provider
 * Manages active child profile state, profile list, and updates in local SQLite.
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfiles = useCallback(async () => {
    try {
      const [currentActive, allProfiles] = await Promise.all([
        ProfileService.getActiveProfile(),
        ChildProfileRepository.listChildProfiles(),
      ]);
      setActiveProfile(currentActive);
      setProfiles(allProfiles);
    } catch (error) {
      console.warn("[ProfileProvider] Error loading profiles:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const switchProfile = useCallback(
    async (profileId: string) => {
      try {
        await ChildProfileRepository.setActiveChildProfile(profileId);
        await refreshProfiles();
      } catch (error) {
        console.warn("[ProfileProvider] Failed to switch profile:", error);
      }
    },
    [refreshProfiles]
  );

  const updateNickname = useCallback(
    async (newNickname: string) => {
      if (!activeProfile) return;
      try {
        const updated = await ProfileService.updateNickname(
          activeProfile.id,
          newNickname
        );
        if (updated) {
          setActiveProfile({ ...updated, isActive: true });
          setProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...updated, isActive: true } : p))
          );
        }
      } catch (error) {
        console.warn("[ProfileProvider] Failed to update nickname:", error);
      }
    },
    [activeProfile]
  );

  const updateAvatar = useCallback(
    async (newAvatarId: string) => {
      if (!activeProfile) return;
      try {
        const updated = await ProfileService.updateAvatar(
          activeProfile.id,
          newAvatarId
        );
        if (updated) {
          setActiveProfile({ ...updated, isActive: true });
          setProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...updated, isActive: true } : p))
          );
        }
      } catch (error) {
        console.warn("[ProfileProvider] Failed to update avatar:", error);
      }
    },
    [activeProfile]
  );

  const updateLanguage = useCallback(
    async (newLanguage: Locale) => {
      if (!activeProfile) return;
      try {
        const updated = await ProfileService.updateLanguage(
          activeProfile.id,
          newLanguage
        );
        if (updated) {
          setActiveProfile({ ...updated, isActive: true });
          setProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...updated, isActive: true } : p))
          );
        }
      } catch (error) {
        console.warn("[ProfileProvider] Failed to update language:", error);
      }
    },
    [activeProfile]
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      try {
        await ChildProfileRepository.deleteChildProfile(profileId);
        await refreshProfiles();
      } catch (error) {
        console.warn("[ProfileProvider] Failed to delete profile:", error);
      }
    },
    [refreshProfiles]
  );

  const contextValue = useMemo<ProfileContextValue>(
    () => ({
      activeProfile,
      profiles,
      isLoading,
      refreshProfiles,
      switchProfile,
      updateNickname,
      updateAvatar,
      updateLanguage,
      deleteProfile,
    }),
    [
      activeProfile,
      profiles,
      isLoading,
      refreshProfiles,
      switchProfile,
      updateNickname,
      updateAvatar,
      updateLanguage,
      deleteProfile,
    ]
  );

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Hook for consuming the currently active child profile.
 */
export function useActiveProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useActiveProfile must be used within a ProfileProvider");
  }

  return {
    profile: context.activeProfile,
    isLoading: context.isLoading,
    refreshProfile: context.refreshProfiles,
    updateNickname: context.updateNickname,
    updateAvatar: context.updateAvatar,
    updateLanguage: context.updateLanguage,
  };
}

/**
 * Hook for multi-child profile management and switching.
 */
export function useChildProfiles() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useChildProfiles must be used within a ProfileProvider");
  }

  return {
    profiles: context.profiles,
    activeProfile: context.activeProfile,
    isLoading: context.isLoading,
    refreshProfiles: context.refreshProfiles,
    switchProfile: context.switchProfile,
    deleteProfile: context.deleteProfile,
  };
}
