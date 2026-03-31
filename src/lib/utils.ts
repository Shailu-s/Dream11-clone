import { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getRelativeDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTokens(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"] as const;

export const ROLE_LABELS: Record<string, string> = {
  WK: "Wicket Keeper",
  BAT: "Batters",
  AR: "All Rounders",
  BOWL: "Bowlers",
};

interface TeamInfo {
  name: string;
  initials: string;
  color: string;
  logo: string;
}

const IPL_TEAM_LIST: TeamInfo[] = [
  { name: "Chennai Super Kings", initials: "CSK", color: "bg-yellow-500", logo: "/teams/CSK.png" },
  { name: "Mumbai Indians", initials: "MI", color: "bg-blue-600", logo: "/teams/MI.png" },
  { name: "Royal Challengers Bengaluru", initials: "RCB", color: "bg-red-600", logo: "/teams/RCB.png" },
  { name: "Kolkata Knight Riders", initials: "KKR", color: "bg-purple-700", logo: "/teams/KKR.png" },
  { name: "Rajasthan Royals", initials: "RR", color: "bg-pink-500", logo: "/teams/RR.png" },
  { name: "Sunrisers Hyderabad", initials: "SRH", color: "bg-orange-500", logo: "/teams/SRH.png" },
  { name: "Delhi Capitals", initials: "DC", color: "bg-blue-800", logo: "/teams/DC.png" },
  { name: "Punjab Kings", initials: "PBKS", color: "bg-red-500", logo: "/teams/PBKS.png" },
  { name: "Gujarat Titans", initials: "GT", color: "bg-slate-800", logo: "/teams/GT.png" },
  { name: "Lucknow Super Giants", initials: "LSG", color: "bg-cyan-500", logo: "/teams/LSG.png" },
];

// Build lookup map: maps initials, full name (uppercase), and aliases to team info
const IPL_TEAMS_MAP = new Map<string, TeamInfo>();
for (const team of IPL_TEAM_LIST) {
  IPL_TEAMS_MAP.set(team.initials, team);
  IPL_TEAMS_MAP.set(team.name.toUpperCase(), team);
}
// Aliases
IPL_TEAMS_MAP.set("PK", IPL_TEAMS_MAP.get("PBKS")!);

export function getTeamInfo(name: string): TeamInfo {
  const upper = name.toUpperCase().trim();

  // Exact match (initials or full name)
  const exact = IPL_TEAMS_MAP.get(upper);
  if (exact) return exact;

  // Substring match
  const lower = name.toLowerCase();
  for (const team of IPL_TEAM_LIST) {
    if (lower.includes(team.name.toLowerCase()) || team.name.toLowerCase().includes(lower)) {
      return team;
    }
  }

  // Fallback
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();
  return {
    name,
    initials,
    color: "bg-primary",
    logo: `https://ui-avatars.com/api/?name=${initials}&background=random`,
  };
}
