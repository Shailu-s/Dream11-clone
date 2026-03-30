
import { calculateFantasyPoints, calculateEntryPoints } from "../src/lib/scoring";
import { validateTeam } from "../src/lib/team-validation";

function testScoring() {
  console.log("--- Testing Scoring Logic ---");
  
  // Test Case 1: Simple batting (10 runs, 1 four)
  const stats1 = {
    runs: 10, ballsFaced: 5, fours: 1, sixes: 0, 
    wickets: 0, oversBowled: 0, maidens: 0, runsConceded: 0,
    catches: 0, stumpings: 0, runOutsDirect: 0, runOutsIndirect: 0,
    lbwBowled: 0, didBat: true, isOut: false
  };
  const pts1 = calculateFantasyPoints(stats1);
  console.log(`Test 1 (Batting): 10 runs + 1 four = ${pts1} (Expected: 11)`);
  
  // Test Case 2: 3 Wickets + LBW/Bowled bonus
  const stats2 = {
    runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
    wickets: 3, oversBowled: 4, maidens: 1, runsConceded: 20,
    catches: 0, stumpings: 0, runOutsDirect: 0, runOutsIndirect: 0,
    lbwBowled: 2, didBat: false, isOut: false
  };
  const pts2 = calculateFantasyPoints(stats2);
  // (3 * 25) + (2 * 8) + (3 wk bonus = 4) + (1 maiden = 12) + (er < 6 bonus = 4)
  console.log(`Test 2 (Bowling): 3 wk + 2 LBW + 1 maiden = ${pts2} (Expected: 111)`);

  // Test Case 3: Captain & VC multipliers
  const selections = [
    { playerId: "p1", isCaptain: true, isViceCaptain: false },
    { playerId: "p2", isCaptain: false, isViceCaptain: true },
    { playerId: "p3", isCaptain: false, isViceCaptain: false },
  ];
  const statsMap = new Map([
    ["p1", 100],
    ["p2", 100],
    ["p3", 100],
  ]);
  const totalEntryPts = calculateEntryPoints(selections, statsMap);
  console.log(`Test 3 (Multipliers): C(100) + VC(100) + P(100) = ${totalEntryPts} (Expected: 450)`);
}

function testTeamValidation() {
  console.log("\n--- Testing Team Validation ---");
  
  const players = Array.from({ length: 22 }, (_, i) => ({
    id: `p${i+1}`,
    team: i < 11 ? "TeamA" : "TeamB",
    role: i < 2 ? "WK" : i < 8 ? "BAT" : i < 12 ? "AR" : "BOWL",
    creditPrice: 9.0
  }));

  // Valid team
  const validSelections = [
    { playerId: "p1", isCaptain: true, isViceCaptain: false }, // WK
    { playerId: "p3", isCaptain: false, isViceCaptain: true }, // BAT
    { playerId: "p4", isCaptain: false, isViceCaptain: false }, // BAT
    { playerId: "p5", isCaptain: false, isViceCaptain: false }, // BAT
    { playerId: "p9", isCaptain: false, isViceCaptain: false }, // AR
    { playerId: "p10", isCaptain: false, isViceCaptain: false }, // AR
    { playerId: "p13", isCaptain: false, isViceCaptain: false }, // BOWL
    { playerId: "p14", isCaptain: false, isViceCaptain: false }, // BOWL
    { playerId: "p15", isCaptain: false, isViceCaptain: false }, // BOWL
    { playerId: "p16", isCaptain: false, isViceCaptain: false }, // BOWL
    { playerId: "p17", isCaptain: false, isViceCaptain: false }, // BOWL
  ];
  const v1 = validateTeam(validSelections, players);
  console.log(`Test 4 (Valid Team): Valid=${v1.valid} (Expected: true)`);
  if (!v1.valid) console.log("Errors:", v1.errors);

  // Invalid team: Too many from one team
  const tooManyFromOneTeam = Array.from({ length: 11 }, (_, i) => ({
    playerId: `p${i+1}`,
    isCaptain: i === 0,
    isViceCaptain: i === 1
  }));
  const v2 = validateTeam(tooManyFromOneTeam, players);
  console.log(`Test 5 (Team Limit): Valid=${v2.valid} (Expected: false, Error: Max 7 from TeamA)`);
  if (!v2.valid) console.log("Errors:", v2.errors.filter(e => e.includes("Max 7")));
}

testScoring();
testTeamValidation();
