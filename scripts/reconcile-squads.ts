import { prisma } from "../src/lib/prisma";
import fs from "fs";

const SEASON = "IPL 2026";

async function main() {
  const squadFiles = [
    "/tmp/squad-kkr-pbks.json",
    "/tmp/squad-csk-rcb.json",
    "/tmp/squad-srh-lsg.json",
    "/tmp/squad-rr-gt.json",
    "/tmp/squad-mi-dc.json"
  ];

  let addedCount = 0;
  let updatedCount = 0;

  for (const file of squadFiles) {
    if (!fs.existsSync(file)) continue;
    const squadData = JSON.parse(fs.readFileSync(file, "utf8"));
    const teams = squadData.data || [];

    for (const team of teams) {
      const dbTeam = team.shortname;
      const apiPlayers = team.players || [];
      console.log(`Processing ${team.teamName} (${dbTeam})...`);

      const dbPlayers = await prisma.player.findMany({
        where: { team: dbTeam, season: SEASON }
      });

      for (const apiP of apiPlayers) {
        // Find by name similarity
        const found = dbPlayers.find(dp => {
          const dbNorm = dp.name.toLowerCase().replace(/[.-]/g, "").replace(/\s+/g, " ").trim();
          const apiNorm = apiP.name.toLowerCase().replace(/[.-]/g, "").replace(/\s+/g, " ").trim();
          return dbNorm === apiNorm || dbNorm.includes(apiNorm) || apiNorm.includes(dbNorm);
        });

        const roleMap: any = {
          "Batsman": "BAT",
          "Bowler": "BOWL",
          "All-rounder": "AR",
          "WK-Batsman": "WK",
          "Wicketkeeper": "WK"
        };
        const role = roleMap[apiP.role] || "BAT";

        if (found) {
          // Update name if different
          if (found.name !== apiP.name) {
            await prisma.player.update({
              where: { id: found.id },
              data: { name: apiP.name }
            });
            updatedCount++;
          }
        } else {
          // Add missing player
          await prisma.player.create({
            data: {
              name: apiP.name,
              team: dbTeam,
              role: role,
              creditPrice: 7.5, // Default for new players
              season: SEASON
            }
          });
          addedCount++;
        }
      }
    }
  }

  console.log(`\nReconciliation Complete:`);
  console.log(`- Added: ${addedCount} new players`);
  console.log(`- Updated: ${updatedCount} player names`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
