import { ChildProfile } from "@/types/user";

export interface ProfileState {
  profiles: ChildProfile[];
  activeProfileId?: string;
}
