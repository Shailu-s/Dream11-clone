import { prisma } from "../src/lib/prisma";

// IPL 2025 players with approximate pricing
const PLAYERS: Array<{
  name: string;
  team: string;
  role: "WK" | "BAT" | "AR" | "BOWL";
  creditPrice: number;
}> = [
  // CSK
  { name: "MS Dhoni", team: "CSK", role: "WK", creditPrice: 8.5 },
  { name: "Ruturaj Gaikwad", team: "CSK", role: "BAT", creditPrice: 9.5 },
  { name: "Devon Conway", team: "CSK", role: "BAT", creditPrice: 9.0 },
  { name: "Shivam Dube", team: "CSK", role: "AR", creditPrice: 8.5 },
  { name: "Ravindra Jadeja", team: "CSK", role: "AR", creditPrice: 9.0 },
  { name: "Matheesha Pathirana", team: "CSK", role: "BOWL", creditPrice: 8.5 },
  { name: "Deepak Chahar", team: "CSK", role: "BOWL", creditPrice: 8.0 },
  { name: "Tushar Deshpande", team: "CSK", role: "BOWL", creditPrice: 7.5 },
  { name: "Moeen Ali", team: "CSK", role: "AR", creditPrice: 8.0 },
  { name: "Rajvardhan Hangargekar", team: "CSK", role: "AR", creditPrice: 7.0 },
  { name: "Aravelly Avanish", team: "CSK", role: "BAT", creditPrice: 6.0 },
  { name: "Shaik Rasheed", team: "CSK", role: "BAT", creditPrice: 7.0 },
  { name: "Rachin Ravindra", team: "CSK", role: "AR", creditPrice: 8.5 },
  { name: "Noor Ahmad", team: "CSK", role: "BOWL", creditPrice: 7.5 },
  { name: "Khaleel Ahmed", team: "CSK", role: "BOWL", creditPrice: 7.5 },

  // MI
  { name: "Rohit Sharma", team: "MI", role: "BAT", creditPrice: 9.5 },
  { name: "Ishan Kishan", team: "MI", role: "WK", creditPrice: 8.5 },
  { name: "Suryakumar Yadav", team: "MI", role: "BAT", creditPrice: 9.5 },
  { name: "Tilak Varma", team: "MI", role: "BAT", creditPrice: 8.5 },
  { name: "Hardik Pandya", team: "MI", role: "AR", creditPrice: 9.5 },
  { name: "Tim David", team: "MI", role: "BAT", creditPrice: 8.0 },
  { name: "Jasprit Bumrah", team: "MI", role: "BOWL", creditPrice: 10.0 },
  { name: "Trent Boult", team: "MI", role: "BOWL", creditPrice: 8.5 },
  { name: "Piyush Chawla", team: "MI", role: "BOWL", creditPrice: 7.0 },
  { name: "Naman Dhir", team: "MI", role: "AR", creditPrice: 7.5 },
  { name: "Will Jacks", team: "MI", role: "AR", creditPrice: 8.5 },
  { name: "Deepak Chahar", team: "MI", role: "BOWL", creditPrice: 8.0 },
  { name: "Reece Topley", team: "MI", role: "BOWL", creditPrice: 7.5 },
  { name: "Robin Minz", team: "MI", role: "WK", creditPrice: 6.5 },
  { name: "Bevon Jacobs", team: "MI", role: "BAT", creditPrice: 6.0 },

  // RCB
  { name: "Virat Kohli", team: "RCB", role: "BAT", creditPrice: 10.5 },
  { name: "Rajat Patidar", team: "RCB", role: "BAT", creditPrice: 8.5 },
  { name: "Phil Salt", team: "RCB", role: "WK", creditPrice: 9.0 },
  { name: "Liam Livingstone", team: "RCB", role: "AR", creditPrice: 8.5 },
  { name: "Krunal Pandya", team: "RCB", role: "AR", creditPrice: 8.0 },
  { name: "Josh Hazlewood", team: "RCB", role: "BOWL", creditPrice: 9.0 },
  { name: "Yash Dayal", team: "RCB", role: "BOWL", creditPrice: 8.0 },
  { name: "Bhuvneshwar Kumar", team: "RCB", role: "BOWL", creditPrice: 8.0 },
  { name: "Suyash Sharma", team: "RCB", role: "BOWL", creditPrice: 6.5 },
  { name: "Jitesh Sharma", team: "RCB", role: "WK", creditPrice: 7.5 },
  { name: "Swapnil Singh", team: "RCB", role: "AR", creditPrice: 7.0 },
  { name: "Manoj Bhandage", team: "RCB", role: "AR", creditPrice: 6.5 },
  { name: "Rasikh Salam", team: "RCB", role: "BOWL", creditPrice: 7.0 },
  { name: "Devdutt Padikkal", team: "RCB", role: "BAT", creditPrice: 7.5 },
  { name: "Tim David", team: "RCB", role: "BAT", creditPrice: 8.0 },

  // KKR
  { name: "Shreyas Iyer", team: "KKR", role: "BAT", creditPrice: 9.0 },
  { name: "Venkatesh Iyer", team: "KKR", role: "AR", creditPrice: 8.5 },
  { name: "Andre Russell", team: "KKR", role: "AR", creditPrice: 9.5 },
  { name: "Sunil Narine", team: "KKR", role: "AR", creditPrice: 9.0 },
  { name: "Phil Salt", team: "KKR", role: "WK", creditPrice: 9.0 },
  { name: "Nitish Rana", team: "KKR", role: "BAT", creditPrice: 8.0 },
  { name: "Rinku Singh", team: "KKR", role: "BAT", creditPrice: 8.5 },
  { name: "Varun Chakravarthy", team: "KKR", role: "BOWL", creditPrice: 8.5 },
  { name: "Harshit Rana", team: "KKR", role: "BOWL", creditPrice: 8.0 },
  { name: "Vaibhav Arora", team: "KKR", role: "BOWL", creditPrice: 7.5 },
  { name: "Ramandeep Singh", team: "KKR", role: "AR", creditPrice: 7.0 },
  { name: "Angkrish Raghuvanshi", team: "KKR", role: "BAT", creditPrice: 6.5 },
  { name: "Mitchell Starc", team: "KKR", role: "BOWL", creditPrice: 9.5 },
  { name: "Anrich Nortje", team: "KKR", role: "BOWL", creditPrice: 8.5 },
  { name: "Quinton de Kock", team: "KKR", role: "WK", creditPrice: 9.0 },

  // DC
  { name: "Rishabh Pant", team: "DC", role: "WK", creditPrice: 9.5 },
  { name: "David Warner", team: "DC", role: "BAT", creditPrice: 9.0 },
  { name: "Axar Patel", team: "DC", role: "AR", creditPrice: 8.5 },
  { name: "Kuldeep Yadav", team: "DC", role: "BOWL", creditPrice: 8.5 },
  { name: "Anrich Nortje", team: "DC", role: "BOWL", creditPrice: 8.5 },
  { name: "Mitchell Marsh", team: "DC", role: "AR", creditPrice: 8.5 },
  { name: "Prithvi Shaw", team: "DC", role: "BAT", creditPrice: 7.5 },
  { name: "Abishek Porel", team: "DC", role: "WK", creditPrice: 7.5 },
  { name: "Tristan Stubbs", team: "DC", role: "BAT", creditPrice: 8.0 },
  { name: "Ishant Sharma", team: "DC", role: "BOWL", creditPrice: 7.0 },
  { name: "Mukesh Kumar", team: "DC", role: "BOWL", creditPrice: 7.5 },
  { name: "Khaleel Ahmed", team: "DC", role: "BOWL", creditPrice: 7.5 },
  { name: "Jake Fraser-McGurk", team: "DC", role: "BAT", creditPrice: 8.0 },
  { name: "Harry Brook", team: "DC", role: "BAT", creditPrice: 9.0 },
  { name: "Faf du Plessis", team: "DC", role: "BAT", creditPrice: 8.0 },

  // PBKS
  { name: "Shikhar Dhawan", team: "PBKS", role: "BAT", creditPrice: 8.0 },
  { name: "Jonny Bairstow", team: "PBKS", role: "WK", creditPrice: 8.5 },
  { name: "Liam Livingstone", team: "PBKS", role: "AR", creditPrice: 8.5 },
  { name: "Sam Curran", team: "PBKS", role: "AR", creditPrice: 8.5 },
  { name: "Kagiso Rabada", team: "PBKS", role: "BOWL", creditPrice: 9.0 },
  { name: "Arshdeep Singh", team: "PBKS", role: "BOWL", creditPrice: 8.5 },
  { name: "Rahul Chahar", team: "PBKS", role: "BOWL", creditPrice: 7.5 },
  { name: "Jitesh Sharma", team: "PBKS", role: "WK", creditPrice: 7.5 },
  { name: "Prabhsimran Singh", team: "PBKS", role: "WK", creditPrice: 7.0 },
  { name: "Rilee Rossouw", team: "PBKS", role: "BAT", creditPrice: 8.0 },
  { name: "Harpreet Brar", team: "PBKS", role: "AR", creditPrice: 7.0 },
  { name: "Nathan Ellis", team: "PBKS", role: "BOWL", creditPrice: 7.5 },
  { name: "Shreyas Iyer", team: "PBKS", role: "BAT", creditPrice: 9.0 },
  { name: "Yuzvendra Chahal", team: "PBKS", role: "BOWL", creditPrice: 8.5 },
  { name: "Marcus Stoinis", team: "PBKS", role: "AR", creditPrice: 8.5 },

  // RR
  { name: "Sanju Samson", team: "RR", role: "WK", creditPrice: 9.0 },
  { name: "Jos Buttler", team: "RR", role: "WK", creditPrice: 9.5 },
  { name: "Yashasvi Jaiswal", team: "RR", role: "BAT", creditPrice: 9.5 },
  { name: "Shimron Hetmyer", team: "RR", role: "BAT", creditPrice: 8.0 },
  { name: "Riyan Parag", team: "RR", role: "AR", creditPrice: 8.5 },
  { name: "Ravichandran Ashwin", team: "RR", role: "BOWL", creditPrice: 8.0 },
  { name: "Trent Boult", team: "RR", role: "BOWL", creditPrice: 8.5 },
  { name: "Yuzvendra Chahal", team: "RR", role: "BOWL", creditPrice: 8.5 },
  { name: "Sandeep Sharma", team: "RR", role: "BOWL", creditPrice: 7.0 },
  { name: "Dhruv Jurel", team: "RR", role: "WK", creditPrice: 7.5 },
  { name: "Rovman Powell", team: "RR", role: "BAT", creditPrice: 7.5 },
  { name: "Wanindu Hasaranga", team: "RR", role: "AR", creditPrice: 8.5 },
  { name: "Jofra Archer", team: "RR", role: "BOWL", creditPrice: 9.0 },
  { name: "Shubham Dubey", team: "RR", role: "BAT", creditPrice: 6.5 },
  { name: "Kumar Kartikeya", team: "RR", role: "BOWL", creditPrice: 7.0 },

  // SRH
  { name: "Heinrich Klaasen", team: "SRH", role: "WK", creditPrice: 9.5 },
  { name: "Travis Head", team: "SRH", role: "BAT", creditPrice: 9.5 },
  { name: "Abhishek Sharma", team: "SRH", role: "AR", creditPrice: 8.5 },
  { name: "Pat Cummins", team: "SRH", role: "BOWL", creditPrice: 9.5 },
  { name: "Bhuvneshwar Kumar", team: "SRH", role: "BOWL", creditPrice: 8.0 },
  { name: "T Natarajan", team: "SRH", role: "BOWL", creditPrice: 7.5 },
  { name: "Washington Sundar", team: "SRH", role: "AR", creditPrice: 7.5 },
  { name: "Rahul Tripathi", team: "SRH", role: "BAT", creditPrice: 7.5 },
  { name: "Abdul Samad", team: "SRH", role: "BAT", creditPrice: 7.0 },
  { name: "Nitish Reddy", team: "SRH", role: "AR", creditPrice: 8.0 },
  { name: "Glenn Phillips", team: "SRH", role: "WK", creditPrice: 8.0 },
  { name: "Jaydev Unadkat", team: "SRH", role: "BOWL", creditPrice: 7.0 },
  { name: "Umran Malik", team: "SRH", role: "BOWL", creditPrice: 7.5 },
  { name: "Aiden Markram", team: "SRH", role: "BAT", creditPrice: 8.0 },
  { name: "Ishan Kishan", team: "SRH", role: "WK", creditPrice: 8.5 },

  // GT
  { name: "Shubman Gill", team: "GT", role: "BAT", creditPrice: 9.5 },
  { name: "Wriddhiman Saha", team: "GT", role: "WK", creditPrice: 7.5 },
  { name: "Sai Sudharsan", team: "GT", role: "BAT", creditPrice: 8.0 },
  { name: "Rashid Khan", team: "GT", role: "BOWL", creditPrice: 9.5 },
  { name: "Mohammed Shami", team: "GT", role: "BOWL", creditPrice: 9.0 },
  { name: "David Miller", team: "GT", role: "BAT", creditPrice: 8.5 },
  { name: "Rahul Tewatia", team: "GT", role: "AR", creditPrice: 7.5 },
  { name: "Vijay Shankar", team: "GT", role: "AR", creditPrice: 7.0 },
  { name: "Jos Buttler", team: "GT", role: "WK", creditPrice: 9.5 },
  { name: "Kagiso Rabada", team: "GT", role: "BOWL", creditPrice: 9.0 },
  { name: "Spencer Johnson", team: "GT", role: "BOWL", creditPrice: 7.5 },
  { name: "Mahipal Lomror", team: "GT", role: "AR", creditPrice: 7.0 },
  { name: "Shahrukh Khan", team: "GT", role: "BAT", creditPrice: 7.5 },
  { name: "Sai Kishore", team: "GT", role: "BOWL", creditPrice: 7.0 },
  { name: "Ishant Sharma", team: "GT", role: "BOWL", creditPrice: 7.0 },

  // LSG
  { name: "KL Rahul", team: "LSG", role: "WK", creditPrice: 9.5 },
  { name: "Quinton de Kock", team: "LSG", role: "WK", creditPrice: 9.0 },
  { name: "Nicholas Pooran", team: "LSG", role: "WK", creditPrice: 8.5 },
  { name: "Marcus Stoinis", team: "LSG", role: "AR", creditPrice: 8.5 },
  { name: "Kyle Mayers", team: "LSG", role: "AR", creditPrice: 7.5 },
  { name: "Ravi Bishnoi", team: "LSG", role: "BOWL", creditPrice: 8.0 },
  { name: "Avesh Khan", team: "LSG", role: "BOWL", creditPrice: 7.5 },
  { name: "Mark Wood", team: "LSG", role: "BOWL", creditPrice: 8.5 },
  { name: "Mohsin Khan", team: "LSG", role: "BOWL", creditPrice: 7.0 },
  { name: "Deepak Hooda", team: "LSG", role: "AR", creditPrice: 7.5 },
  { name: "Ayush Badoni", team: "LSG", role: "BAT", creditPrice: 7.5 },
  { name: "Devdutt Padikkal", team: "LSG", role: "BAT", creditPrice: 7.5 },
  { name: "Rishabh Pant", team: "LSG", role: "WK", creditPrice: 9.5 },
  { name: "Mitchell Starc", team: "LSG", role: "BOWL", creditPrice: 9.5 },
  { name: "David Miller", team: "LSG", role: "BAT", creditPrice: 8.5 },
];

// IPL 2025 schedule (sample matches)
const IPL_2025_MATCHES = [
  { team1: "KKR", team2: "RCB", date: "2025-03-21T19:30:00+05:30", venue: "Eden Gardens, Kolkata" },
  { team1: "SRH", team2: "RR", date: "2025-03-22T15:30:00+05:30", venue: "Rajiv Gandhi Stadium, Hyderabad" },
  { team1: "CSK", team2: "MI", date: "2025-03-22T19:30:00+05:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "DC", team2: "LSG", date: "2025-03-23T19:30:00+05:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "GT", team2: "PBKS", date: "2025-03-24T19:30:00+05:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "RR", team2: "KKR", date: "2025-03-25T19:30:00+05:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "RCB", team2: "CSK", date: "2025-03-26T19:30:00+05:30", venue: "M Chinnaswamy Stadium, Bengaluru" },
  { team1: "MI", team2: "SRH", date: "2025-03-27T19:30:00+05:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "LSG", team2: "GT", date: "2025-03-28T19:30:00+05:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "PBKS", team2: "DC", date: "2025-03-29T15:30:00+05:30", venue: "IS Bindra Stadium, Mohali" },
  { team1: "KKR", team2: "MI", date: "2025-03-29T19:30:00+05:30", venue: "Eden Gardens, Kolkata" },
  { team1: "SRH", team2: "CSK", date: "2025-03-30T15:30:00+05:30", venue: "Rajiv Gandhi Stadium, Hyderabad" },
  { team1: "RCB", team2: "GT", date: "2025-03-30T19:30:00+05:30", venue: "M Chinnaswamy Stadium, Bengaluru" },
  { team1: "RR", team2: "PBKS", date: "2025-03-31T19:30:00+05:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "DC", team2: "KKR", date: "2025-04-01T19:30:00+05:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "LSG", team2: "SRH", date: "2025-04-02T19:30:00+05:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "MI", team2: "RR", date: "2025-04-03T19:30:00+05:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "GT", team2: "CSK", date: "2025-04-04T19:30:00+05:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "PBKS", team2: "RCB", date: "2025-04-05T15:30:00+05:30", venue: "IS Bindra Stadium, Mohali" },
  { team1: "DC", team2: "MI", date: "2025-04-05T19:30:00+05:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "KKR", team2: "LSG", date: "2025-04-06T15:30:00+05:30", venue: "Eden Gardens, Kolkata" },
  { team1: "SRH", team2: "GT", date: "2025-04-06T19:30:00+05:30", venue: "Rajiv Gandhi Stadium, Hyderabad" },
  { team1: "CSK", team2: "RR", date: "2025-04-07T19:30:00+05:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "RCB", team2: "DC", date: "2025-04-08T19:30:00+05:30", venue: "M Chinnaswamy Stadium, Bengaluru" },
  { team1: "PBKS", team2: "KKR", date: "2025-04-09T19:30:00+05:30", venue: "IS Bindra Stadium, Mohali" },
  { team1: "MI", team2: "LSG", date: "2025-04-10T19:30:00+05:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "GT", team2: "RR", date: "2025-04-11T19:30:00+05:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "CSK", team2: "PBKS", date: "2025-04-12T15:30:00+05:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "SRH", team2: "RCB", date: "2025-04-12T19:30:00+05:30", venue: "Rajiv Gandhi Stadium, Hyderabad" },
  { team1: "DC", team2: "GT", date: "2025-04-13T15:30:00+05:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "KKR", team2: "CSK", date: "2025-04-13T19:30:00+05:30", venue: "Eden Gardens, Kolkata" },
  { team1: "LSG", team2: "PBKS", date: "2025-04-14T19:30:00+05:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "RR", team2: "SRH", date: "2025-04-15T19:30:00+05:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "MI", team2: "RCB", date: "2025-04-16T19:30:00+05:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "GT", team2: "KKR", date: "2025-04-17T19:30:00+05:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "PBKS", team2: "SRH", date: "2025-04-18T19:30:00+05:30", venue: "IS Bindra Stadium, Mohali" },
  { team1: "CSK", team2: "DC", date: "2025-04-19T15:30:00+05:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "LSG", team2: "RR", date: "2025-04-19T19:30:00+05:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "RCB", team2: "MI", date: "2025-04-20T15:30:00+05:30", venue: "M Chinnaswamy Stadium, Bengaluru" },
  { team1: "KKR", team2: "PBKS", date: "2025-04-20T19:30:00+05:30", venue: "Eden Gardens, Kolkata" },
];

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@stars11.local" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@stars11.local",
      username: "admin",
      role: "ADMIN",
      tokenBalance: 99999,
    },
  });
  console.log(`Admin user created: ${admin.username}`);

  // Seed players
  for (const player of PLAYERS) {
    await prisma.player.upsert({
      where: {
        name_team_season: {
          name: player.name,
          team: player.team,
          season: "IPL 2025",
        },
      },
      update: { creditPrice: player.creditPrice, role: player.role },
      create: {
        name: player.name,
        team: player.team,
        role: player.role,
        creditPrice: player.creditPrice,
        season: "IPL 2025",
      },
    });
  }
  console.log(`${PLAYERS.length} players seeded`);

  // Seed matches
  for (const match of IPL_2025_MATCHES) {
    const existing = await prisma.match.findFirst({
      where: {
        team1: match.team1,
        team2: match.team2,
        date: new Date(match.date),
      },
    });
    if (!existing) {
      await prisma.match.create({
        data: {
          team1: match.team1,
          team2: match.team2,
          date: new Date(match.date),
          venue: match.venue,
          season: "IPL 2025",
        },
      });
    }
  }
  console.log(`${IPL_2025_MATCHES.length} matches seeded`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
