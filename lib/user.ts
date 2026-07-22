type UserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function getUserDisplayName(user: UserLike) {
  const metadata = user.user_metadata ?? {}

  const candidates = [
    readString(metadata.full_name),
    readString(metadata.name),
    readString(metadata.user_name),
    readString(metadata.username),
    readString(metadata.preferred_username),
  ]

  const name = candidates.find(Boolean)
  if (name) {
    return name
  }

  const email = readString(user.email)
  if (email) {
    return email.split("@")[0] || email
  }

  return "User"
}

export function getUserAvatarUrl(user: UserLike) {
  const metadata = user.user_metadata ?? {}

  const candidates = [
    readString(metadata.avatar_url),
    readString(metadata.picture),
    readString(metadata.avatar),
    readString(metadata.image),
  ]

  return candidates.find(Boolean) ?? ""
}

export function getUserInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0) {
    return "U"
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}