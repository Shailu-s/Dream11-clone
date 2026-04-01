"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface SavedTeam {
  id: string;
  teamName: string;
  players: Array<{ playerId: string; isCaptain: boolean; isViceCaptain: boolean }>;
}

interface Player {
  id: string;
  name: string;
  team: string;
  role: string;
  creditPrice: number;
  isInPlayingXI?: boolean;
}

interface Selection {
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

const ROLE_MIN: Record<string, number> = { WK: 1, BAT: 3, AR: 1, BOWL: 3 };
const ROLE_MAX: Record<string, number> = { WK: 4, BAT: 6, AR: 4, BOWL: 6 };

export default function TeamSelectionPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedTeamId = searchParams.get("savedTeamId");
  const editEntryId = searchParams.get("editEntryId");
  const [contest, setContest] = useState<{
    match: { team1: string; team2: string; id: string };
    entryFee: number;
    name: string;
  } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [teamName, setTeamName] = useState("");
  const [step, setStep] = useState<"pick" | "select" | "captain">("pick");
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState(""); // inline error on player list

  const draftKey = `draft_team_${id}`;

  useEffect(() => {
    async function load() {
      const contestRes = await fetch(`/api/contests/${id}`);
      const contestData = await contestRes.json();
      setContest(contestData.contest);

      const matchId = contestData.contest.match.id;
      const [playersRes, teamsRes] = await Promise.all([
        fetch(`/api/players?matchId=${matchId}`),
        fetch(`/api/teams?matchId=${matchId}`),
      ]);
      const playersData = await playersRes.json();
      const teamsData = await teamsRes.json();
      setPlayers(playersData.players || []);
      const teams: SavedTeam[] = teamsData.teams || [];
      setSavedTeams(teams);

      // If editing an existing entry, skip straight to select
      if (editEntryId) {
        try {
          const entryRes = await fetch(`/api/contests/${id}/entry/${editEntryId}`);
          const entryData = await entryRes.json();
          if (entryData.entry) {
            setSelections(entryData.entry.players as Array<{ playerId: string; isCaptain: boolean; isViceCaptain: boolean }>);
            setTeamName(entryData.entry.teamName || "");
            setStep("select");
            setLoading(false);
            return;
          }
        } catch { /* fall through */ }
      }

      // If no saved teams, skip straight to select
      if (teams.length === 0) {
        setStep("select");
      }
      // else stay on "pick" step to show saved teams

      setLoading(false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save draft to localStorage whenever selections change
  useEffect(() => {
    if (selections.length > 0) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ selections, teamName }));
      } catch {
        // ignore storage errors
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, teamName]);

  const selectedPlayers = players.filter((p) =>
    selections.some((s) => s.playerId === p.id)
  );
  const totalCredits = selectedPlayers.reduce((sum, p) => sum + p.creditPrice, 0);
  const remainingCredits = 100 - totalCredits;

  const roleCounts: Record<string, number> = {
    WK: selectedPlayers.filter((p) => p.role === "WK").length,
    BAT: selectedPlayers.filter((p) => p.role === "BAT").length,
    AR: selectedPlayers.filter((p) => p.role === "AR").length,
    BOWL: selectedPlayers.filter((p) => p.role === "BOWL").length,
  };

  const teamCounts = new Map<string, number>();
  for (const p of selectedPlayers) {
    teamCounts.set(p.team, (teamCounts.get(p.team) || 0) + 1);
  }

  function getSelectionBlockReason(player: Player): string | null {
    if (selections.length >= 11) return "Team is full (11/11)";
    if (totalCredits + player.creditPrice > 100)
      return `Not enough credits (need ${player.creditPrice}, have ${remainingCredits.toFixed(1)})`;
    const teamCount = teamCounts.get(player.team) || 0;
    if (teamCount >= 7) return `Max 7 players from ${player.team}`;
    const count = roleCounts[player.role] || 0;
    if (count >= ROLE_MAX[player.role])
      return `Max ${ROLE_MAX[player.role]} ${player.role} players allowed`;
    return null;
  }

  function togglePlayer(playerId: string) {
    const existing = selections.find((s) => s.playerId === playerId);
    if (existing) {
      setSelections(selections.filter((s) => s.playerId !== playerId));
      setSelectionError("");
      return;
    }

    const player = players.find((p) => p.id === playerId)!;
    const reason = getSelectionBlockReason(player);
    if (reason) {
      setSelectionError(reason);
      return;
    }

    setSelectionError("");
    setSelections([...selections, { playerId, isCaptain: false, isViceCaptain: false }]);
  }

  function setCaptain(playerId: string) {
    setSelections(
      selections.map((s) => ({
        ...s,
        isCaptain: s.playerId === playerId,
        isViceCaptain: s.isViceCaptain && s.playerId !== playerId,
      }))
    );
  }

  function setViceCaptain(playerId: string) {
    setSelections(
      selections.map((s) => ({
        ...s,
        isViceCaptain: s.playerId === playerId,
        isCaptain: s.isCaptain && s.playerId !== playerId,
      }))
    );
  }

  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setSelections([]);
    setTeamName("");
    setSelectionError("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const captain = selections.find((s) => s.isCaptain);
    const vc = selections.find((s) => s.isViceCaptain);

    if (!captain || !vc) {
      setError("Select both Captain and Vice-Captain");
      setSubmitting(false);
      return;
    }

    const url = editEntryId
      ? `/api/contests/${id}/entry/${editEntryId}`
      : `/api/contests/${id}/enter`;
    const method = editEntryId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: selections, teamName }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // Clear draft on successful submit
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    router.push(`/contests/${id}`);
  }

  if (loading) return <div className="text-muted">Loading players...</div>;
  if (!contest) return <div className="text-danger">Contest not found</div>;

  const filteredPlayers = players.filter((p) => {
    if (filterRole !== "ALL" && p.role !== filterRole) return false;
    if (filterTeam !== "ALL" && p.team !== filterTeam) return false;
    return true;
  });

  // Validation state for "Next" button
  const roleErrors: string[] = [];
  for (const role of ["WK", "BAT", "AR", "BOWL"]) {
    const count = roleCounts[role];
    if (count < ROLE_MIN[role]) roleErrors.push(`Need ${ROLE_MIN[role]}+ ${role}`);
  }
  const canProceed = selections.length === 11 && roleErrors.length === 0 && teamName.trim().length > 0;

  if (step === "pick") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Join Contest</h1>
          <p className="text-sm text-muted mt-1">{contest.match.team1} vs {contest.match.team2}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Your Saved Teams</h2>
          <div className="space-y-2">
            {savedTeams.map((team) => (
              <div
                key={team.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{team.teamName}</div>
                  <div className="text-xs text-muted mt-0.5">{team.players.length} players selected</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelections(team.players);
                      setTeamName(team.teamName);
                      setStep("select");
                    }}
                    className="text-xs text-muted border border-border rounded-lg px-2.5 py-1.5 hover:bg-card-hover transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelections(team.players);
                      setTeamName(team.teamName);
                      setStep("captain");
                    }}
                    className="text-xs text-primary font-semibold border border-primary/30 rounded-lg px-2.5 py-1.5 hover:bg-primary/10 transition-colors"
                  >
                    Use this &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep("select")}
          className="w-full bg-card border border-border font-semibold rounded-lg py-2.5 text-sm hover:bg-card-hover transition-colors"
        >
          + Build a New Team
        </button>
      </div>
    );
  }

  if (step === "captain") {
    return (
      <div>
        <h1 className="text-xl font-bold mb-2">Choose Captain & Vice-Captain</h1>
        <p className="text-muted text-sm mb-4">
          Captain gets 2x points, Vice-Captain gets 1.5x points
        </p>

        <div className="mb-4 bg-card border border-border rounded-lg px-3 py-2 text-sm text-muted flex items-center justify-between">
          <span>Team: <span className="text-foreground font-medium">{teamName}</span></span>
          <button
            onClick={() => setStep("select")}
            className="text-xs text-primary hover:underline"
          >
            Edit name
          </button>
        </div>

        <div className="space-y-2 mb-6">
          {selectedPlayers.map((player) => {
            const sel = selections.find((s) => s.playerId === player.id)!;
            return (
              <div
                key={player.id}
                className="bg-card rounded-lg p-3 border border-border flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-sm">{player.name}</div>
                  <div className="text-xs text-muted">
                    {player.team} &middot; {player.role} &middot; {player.creditPrice} Cr
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCaptain(player.id)}
                    className={`w-10 h-10 rounded-full text-xs font-bold border-2 transition-colors ${
                      sel.isCaptain
                        ? "bg-primary border-primary text-white"
                        : "border-border text-muted hover:border-primary"
                    }`}
                  >
                    C
                  </button>
                  <button
                    onClick={() => setViceCaptain(player.id)}
                    className={`w-10 h-10 rounded-full text-xs font-bold border-2 transition-colors ${
                      sel.isViceCaptain
                        ? "bg-secondary border-secondary text-white"
                        : "border-border text-muted hover:border-secondary"
                    }`}
                  >
                    VC
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-danger text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("select")}
            className="flex-1 bg-card border border-border font-semibold rounded-lg py-2.5 hover:bg-card-hover transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-primary text-white font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {submitting
              ? (editEntryId ? "Updating..." : "Submitting...")
              : editEntryId
              ? "Update Team"
              : `Submit (${contest.entryFee} vINR)`
            }
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Select Your Team</h1>
        {selections.length > 0 && (
          <button
            onClick={clearDraft}
            className="text-xs text-danger hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-muted text-sm mb-3">
        {contest.match.team1} vs {contest.match.team2}
      </p>

      {/* Team name — visible early */}
      <div className="mb-4">
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name * (e.g. Dream XI)"
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          maxLength={30}
        />
      </div>

      {/* Stats bar */}
      <div className="bg-card rounded-xl p-3 border border-border mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span>
            Players: <span className="font-bold text-primary">{selections.length}/11</span>
          </span>
          <span>
            Credits: <span className="font-bold text-success">{remainingCredits.toFixed(1)}</span> left
          </span>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          {(["WK", "BAT", "AR", "BOWL"] as const).map((role) => {
            const count = roleCounts[role];
            const ok = count >= ROLE_MIN[role];
            const over = count > ROLE_MAX[role];
            return (
              <span
                key={role}
                className={`px-2 py-0.5 rounded ${
                  over
                    ? "bg-danger/20 text-danger"
                    : ok
                    ? "bg-success/20 text-success"
                    : "bg-card-hover text-muted"
                }`}
              >
                {role}({count}/{ROLE_MAX[role]})
              </span>
            );
          })}
          {contest.match.team1 && (
            <span className="text-muted ml-auto">
              {contest.match.team1}: {teamCounts.get(contest.match.team1) || 0} &middot;{" "}
              {contest.match.team2}: {teamCounts.get(contest.match.team2) || 0}
            </span>
          )}
        </div>
      </div>

      {/* Inline selection error */}
      {selectionError && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2 mb-3">
          {selectionError}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["ALL", "WK", "BAT", "AR", "BOWL"].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filterRole === role
                ? "bg-primary/20 text-primary"
                : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {role}
          </button>
        ))}
        <span className="border-l border-border mx-1" />
        {["ALL", contest.match.team1, contest.match.team2].map((team) => (
          <button
            key={team}
            onClick={() => setFilterTeam(team)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filterTeam === team
                ? "bg-secondary/20 text-secondary"
                : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="space-y-2 mb-6">
        {filteredPlayers.map((player) => {
          const isSelected = selections.some((s) => s.playerId === player.id);
          const blockReason = !isSelected ? getSelectionBlockReason(player) : null;
          const isBlocked = !isSelected && blockReason !== null;

          return (
            <div
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              className={`w-full text-left bg-card rounded-lg p-3 border transition-colors cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : isBlocked
                  ? "border-border opacity-40 cursor-not-allowed"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted uppercase">
                      {player.role}
                    </div>
                    {player.isInPlayingXI && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{player.name}</div>
                      {player.isInPlayingXI && (
                        <span className="text-[9px] font-bold text-success uppercase bg-success/10 px-1 rounded border border-success/20">
                          Playing
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {player.team} &middot; {player.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{player.creditPrice} Cr</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-border"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom action */}
      <div className="sticky bottom-4">
        {selections.length === 11 && roleErrors.length > 0 && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-xs rounded-lg px-3 py-2 mb-2 text-center">
            {roleErrors.join(" · ")}
          </div>
        )}
        <button
          onClick={() => setStep("captain")}
          disabled={!canProceed}
          className="w-full bg-primary text-white font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {selections.length === 11
            ? roleErrors.length > 0
              ? roleErrors.join(", ")
              : !teamName.trim()
              ? "Enter a team name above"
              : "Next: Choose Captain"
            : `Select ${11 - selections.length} more player${11 - selections.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
