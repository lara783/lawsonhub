interface UserAvatarProps {
  name: string
  colour: string
  initials: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
}

export function UserAvatar({ name, colour, initials, size = "md" }: UserAvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: colour }}
      title={name}
    >
      {initials}
    </div>
  )
}
