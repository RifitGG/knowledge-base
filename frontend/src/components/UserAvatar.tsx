import type { User } from "../types";

interface AvatarProps {
  user: Pick<User, "full_name" | "avatar_url"> | null | undefined;
  size?: number;
  className?: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "")).toUpperCase();
}

export function UserAvatar({ user, size = 36, className }: AvatarProps) {
  const style = { width: size, height: size };
  const fontSize = Math.max(10, Math.round(size / 2.6));
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.full_name}
        style={style}
        className={`rounded-full object-cover ${className || ""}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`grid place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white ${className || ""}`}
    >
      <span style={{ fontSize }}>{initials(user?.full_name || "??")}</span>
    </div>
  );
}
