/**
 * Seed script for Stars11 — IPL 2026 season (REAL DATA)
 * Run with: npm run seed
 *
 * Seeds:
 * - Real IPL 2026 match schedule (70 league matches)
 * - All 10 team squads with correct roles and credit prices
 * - Matches before today auto-marked COMPLETED
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const SEASON = "IPL 2026";

// ─── IPL 2026 Real Squads ─────────────────────────────────────────

interface PlayerSeed {
  name: string;
  role: "WK" | "BAT" | "AR" | "BOWL";
  creditPrice: number;
}

// Credit prices based on player reputation, auction price, and recent form
// This is the source of truth — matches prod DB exactly
const SQUADS: Record<string, PlayerSeed[]> = {
  CSK: [
    { name: "Ruturaj Gaikwad", role: "BAT", creditPrice: 9.5 },
    { name: "MS Dhoni", role: "WK", creditPrice: 8.5 },
    { name: "Dewald Brevis", role: "BAT", creditPrice: 8.0 },
    { name: "Ayush Mhatre", role: "BAT", creditPrice: 7.0 },
    { name: "Kartik Sharma", role: "BAT", creditPrice: 6.5 },
    { name: "Sarfaraz Khan", role: "BAT", creditPrice: 7.5 },
    { name: "Urvil Patel", role: "WK", creditPrice: 6.5 },
    { name: "Jamie Overton", role: "AR", creditPrice: 7.5 },
    { name: "Ramakrishna Ghosh", role: "AR", creditPrice: 6.0 },
    { name: "Prashant Veer", role: "AR", creditPrice: 7.0 },
    { name: "Matthew Short", role: "AR", creditPrice: 7.5 },
    { name: "Shivam Dube", role: "AR", creditPrice: 8.5 },
    { name: "Gurjapneet Singh", role: "BOWL", creditPrice: 6.0 },
    { name: "Khaleel Ahmed", role: "BOWL", creditPrice: 8.0 },
    { name: "Noor Ahmad", role: "BOWL", creditPrice: 7.5 },
    { name: "Anshul Kamboj", role: "BOWL", creditPrice: 6.5 },
    { name: "Mukesh Choudhary", role: "BOWL", creditPrice: 6.5 },
    { name: "Rahul Chahar", role: "BOWL", creditPrice: 7.5 },
    { name: "Matt Henry", role: "BOWL", creditPrice: 8.0 },
    { name: "Spencer Johnson", role: "BOWL", creditPrice: 7.5 },
    { name: "Shreyas Gopal", role: "BOWL", creditPrice: 7.0 },
    { name: "Nathan Ellis", role: "BOWL", creditPrice: 7.0 },
    { name: "Aman Khan", role: "BOWL", creditPrice: 6.0 },
    { name: "Zakary Foulkes", role: "BOWL", creditPrice: 6.0 },
  ],
  DC: [
    { name: "KL Rahul", role: "WK", creditPrice: 10.0 },
    { name: "Karun Nair", role: "BAT", creditPrice: 8.0 },
    { name: "David Miller", role: "BAT", creditPrice: 8.5 },
    { name: "Ben Duckett", role: "BAT", creditPrice: 8.0 },
    { name: "Abishek Porel", role: "WK", creditPrice: 7.0 },
    { name: "Tristan Stubbs", role: "BAT", creditPrice: 7.5 },
    { name: "Prithvi Shaw", role: "BAT", creditPrice: 7.0 },
    { name: "Axar Patel", role: "AR", creditPrice: 9.0 },
    { name: "Sameer Rizvi", role: "AR", creditPrice: 7.0 },
    { name: "Ashutosh Sharma", role: "AR", creditPrice: 6.5 },
    { name: "Nitish Rana", role: "AR", creditPrice: 7.5 },
    { name: "Mitchell Starc", role: "BOWL", creditPrice: 10.0 },
    { name: "T Natarajan", role: "BOWL", creditPrice: 7.5 },
    { name: "Mukesh Kumar", role: "BOWL", creditPrice: 7.0 },
    { name: "Kuldeep Yadav", role: "BOWL", creditPrice: 9.0 },
    { name: "Lungisani Ngidi", role: "BOWL", creditPrice: 7.5 },
  ],
  GT: [
    { name: "Shubman Gill", role: "BAT", creditPrice: 10.0 },
    { name: "Jos Buttler", role: "WK", creditPrice: 9.5 },
    { name: "Kumar Kushagra", role: "WK", creditPrice: 6.5 },
    { name: "Anuj Rawat", role: "WK", creditPrice: 6.5 },
    { name: "Glenn Phillips", role: "BAT", creditPrice: 8.0 },
    { name: "Sai Sudharsan", role: "BAT", creditPrice: 8.0 },
    { name: "Washington Sundar", role: "AR", creditPrice: 7.5 },
    { name: "Rahul Tewatia", role: "AR", creditPrice: 7.5 },
    { name: "Shahrukh Khan", role: "AR", creditPrice: 7.0 },
    { name: "Jason Holder", role: "AR", creditPrice: 8.0 },
    { name: "Sai Kishore", role: "AR", creditPrice: 6.5 },
    { name: "Manav Suthar", role: "AR", creditPrice: 6.5 },
    { name: "Kagiso Rabada", role: "BOWL", creditPrice: 9.5 },
    { name: "Mohammed Siraj", role: "BOWL", creditPrice: 8.5 },
    { name: "Prasidh Krishna", role: "BOWL", creditPrice: 8.0 },
    { name: "Rashid Khan", role: "BOWL", creditPrice: 9.5 },
    { name: "Ishant Sharma", role: "BOWL", creditPrice: 7.0 },
    { name: "Ashok Sharma", role: "BOWL", creditPrice: 6.0 },
  ],
  KKR: [
    { name: "Ajinkya Rahane", role: "BAT", creditPrice: 8.0 },
    { name: "Rinku Singh", role: "BAT", creditPrice: 8.5 },
    { name: "Angkrish Raghuvanshi", role: "BAT", creditPrice: 7.0 },
    { name: "Manish Pandey", role: "BAT", creditPrice: 7.0 },
    { name: "Finn Allen", role: "WK", creditPrice: 7.5 },
    { name: "Tim Seifert", role: "WK", creditPrice: 6.5 },
    { name: "Tejasvi Dahiya", role: "WK", creditPrice: 6.0 },
    { name: "Rahul Tripathi", role: "BAT", creditPrice: 7.5 },
    { name: "Rovman Powell", role: "BAT", creditPrice: 7.5 },
    { name: "Sarthak Ranjan", role: "BAT", creditPrice: 6.0 },
    { name: "Cameron Green", role: "AR", creditPrice: 9.5 },
    { name: "Rachin Ravindra", role: "AR", creditPrice: 8.0 },
    { name: "Ramandeep Singh", role: "AR", creditPrice: 7.0 },
    { name: "Sunil Narine", role: "AR", creditPrice: 9.0 },
    { name: "Anukul Roy", role: "AR", creditPrice: 6.0 },
    { name: "Daksh Kamra", role: "AR", creditPrice: 6.0 },
    { name: "Varun Chakaravarthy", role: "BOWL", creditPrice: 8.5 },
    { name: "Matheesha Pathirana", role: "BOWL", creditPrice: 8.5 },
    { name: "Vaibhav Arora", role: "BOWL", creditPrice: 7.0 },
    { name: "Harshit Rana", role: "BOWL", creditPrice: 7.5 },
    { name: "Akash Deep", role: "BOWL", creditPrice: 7.5 },
    { name: "Umran Malik", role: "BOWL", creditPrice: 7.5 },
    { name: "Navdeep Saini", role: "BOWL", creditPrice: 7.0 },
    { name: "Prashant Solanki", role: "BOWL", creditPrice: 6.5 },
    { name: "Saurabh Dubey", role: "BOWL", creditPrice: 6.0 },
    { name: "Kartik Tyagi", role: "BOWL", creditPrice: 6.5 },
    { name: "Blessing Muzarabani", role: "BOWL", creditPrice: 7.0 },
  ],
  LSG: [
    { name: "Rishabh Pant", role: "WK", creditPrice: 10.0 },
    { name: "Aiden Markram", role: "BAT", creditPrice: 8.0 },
    { name: "Nicholas Pooran", role: "WK", creditPrice: 8.5 },
    { name: "Josh Inglis", role: "WK", creditPrice: 7.5 },
    { name: "Mitchell Marsh", role: "AR", creditPrice: 8.5 },
    { name: "Abdul Samad", role: "AR", creditPrice: 7.0 },
    { name: "Wanindu Hasaranga", role: "AR", creditPrice: 8.5 },
    { name: "Ayush Badoni", role: "AR", creditPrice: 7.5 },
    { name: "Shahbaz Ahmed", role: "AR", creditPrice: 7.0 },
    { name: "Mohammad Shami", role: "BOWL", creditPrice: 9.0 },
    { name: "Avesh Khan", role: "BOWL", creditPrice: 7.5 },
    { name: "Anrich Nortje", role: "BOWL", creditPrice: 8.5 },
    { name: "Mayank Yadav", role: "BOWL", creditPrice: 8.0 },
    { name: "Mohsin Khan", role: "BOWL", creditPrice: 7.0 },
    { name: "Arjun Tendulkar", role: "BOWL", creditPrice: 6.0 },
  ],
  MI: [
    { name: "Rohit Sharma", role: "BAT", creditPrice: 10.0 },
    { name: "Suryakumar Yadav", role: "BAT", creditPrice: 10.0 },
    { name: "Tilak Varma", role: "BAT", creditPrice: 8.5 },
    { name: "Quinton de Kock", role: "WK", creditPrice: 9.0 },
    { name: "Robin Minz", role: "WK", creditPrice: 6.5 },
    { name: "Ryan Rickelton", role: "BAT", creditPrice: 7.5 },
    { name: "Hardik Pandya", role: "AR", creditPrice: 9.5 },
    { name: "Naman Dhir", role: "AR", creditPrice: 7.0 },
    { name: "Will Jacks", role: "AR", creditPrice: 8.5 },
    { name: "Shardul Thakur", role: "AR", creditPrice: 7.5 },
    { name: "Mitchell Santner", role: "AR", creditPrice: 7.5 },
    { name: "Corbin Bosch", role: "AR", creditPrice: 7.0 },
    { name: "Jasprit Bumrah", role: "BOWL", creditPrice: 10.5 },
    { name: "Trent Boult", role: "BOWL", creditPrice: 9.0 },
    { name: "Deepak Chahar", role: "BOWL", creditPrice: 8.0 },
    { name: "Allah Ghazanfar", role: "BOWL", creditPrice: 7.0 },
  ],
  PBKS: [
    { name: "Shreyas Iyer", role: "BAT", creditPrice: 9.5 },
    { name: "Nehal Wadhera", role: "BAT", creditPrice: 7.0 },
    { name: "Prabhsimran Singh", role: "WK", creditPrice: 7.0 },
    { name: "Vishnu Vinod", role: "WK", creditPrice: 6.5 },
    { name: "Shashank Singh", role: "BAT", creditPrice: 7.0 },
    { name: "Priyansh Arya", role: "BAT", creditPrice: 6.5 },
    { name: "Suryansh Shedge", role: "BAT", creditPrice: 6.0 },
    { name: "Harnoor Singh", role: "BAT", creditPrice: 6.0 },
    { name: "Marcus Stoinis", role: "AR", creditPrice: 9.0 },
    { name: "Marco Jansen", role: "AR", creditPrice: 9.0 },
    { name: "Musheer Khan", role: "AR", creditPrice: 7.5 },
    { name: "Harpreet Brar", role: "AR", creditPrice: 7.0 },
    { name: "Azmatullah Omarzai", role: "AR", creditPrice: 7.5 },
    { name: "Cooper Connolly", role: "AR", creditPrice: 7.0 },
    { name: "Arshdeep Singh", role: "BOWL", creditPrice: 9.0 },
    { name: "Yuzvendra Chahal", role: "BOWL", creditPrice: 8.5 },
    { name: "Lockie Ferguson", role: "BOWL", creditPrice: 8.5 },
    { name: "Xavier Bartlett", role: "BOWL", creditPrice: 7.5 },
    { name: "Yash Thakur", role: "BOWL", creditPrice: 7.0 },
    { name: "Vijaykumar Vyshak", role: "BOWL", creditPrice: 7.0 },
    { name: "Praveen Dubey", role: "BOWL", creditPrice: 6.0 },
    { name: "Pyla Avinash", role: "BOWL", creditPrice: 6.0 },
    { name: "Vishal Nishad", role: "BOWL", creditPrice: 6.0 },
    { name: "Ben Dwarshuis", role: "BOWL", creditPrice: 6.5 },
    { name: "Mitchell Owen", role: "BAT", creditPrice: 6.5 },
  ],
  RR: [
    { name: "Yashasvi Jaiswal", role: "BAT", creditPrice: 10.0 },
    { name: "Shimron Hetmyer", role: "BAT", creditPrice: 8.0 },
    { name: "Dhruv Jurel", role: "WK", creditPrice: 7.5 },
    { name: "Vaibhav Sooryavanshi", role: "BAT", creditPrice: 7.0 },
    { name: "Shubham Dubey", role: "BAT", creditPrice: 6.5 },
    { name: "Donovan Ferreira", role: "BAT", creditPrice: 7.0 },
    { name: "Riyan Parag", role: "AR", creditPrice: 8.5 },
    { name: "Ravindra Jadeja", role: "AR", creditPrice: 9.0 },
    { name: "Dasun Shanaka", role: "AR", creditPrice: 7.0 },
    { name: "Jofra Archer", role: "BOWL", creditPrice: 9.5 },
    { name: "Tushar Deshpande", role: "BOWL", creditPrice: 7.5 },
    { name: "Ravi Bishnoi", role: "BOWL", creditPrice: 8.0 },
    { name: "Sandeep Sharma", role: "BOWL", creditPrice: 7.0 },
    { name: "Nandre Burger", role: "BOWL", creditPrice: 7.0 },
    { name: "Kwena Maphaka", role: "BOWL", creditPrice: 7.0 },
    { name: "Kuldeep Sen", role: "BOWL", creditPrice: 6.5 },
  ],
  RCB: [
    { name: "Virat Kohli", role: "BAT", creditPrice: 10.5 },
    { name: "Rajat Patidar", role: "BAT", creditPrice: 8.5 },
    { name: "Devdutt Padikkal", role: "BAT", creditPrice: 7.5 },
    { name: "Phil Salt", role: "WK", creditPrice: 9.0 },
    { name: "Jitesh Sharma", role: "WK", creditPrice: 7.0 },
    { name: "Krunal Pandya", role: "AR", creditPrice: 8.0 },
    { name: "Tim David", role: "AR", creditPrice: 8.5 },
    { name: "Jacob Bethell", role: "AR", creditPrice: 8.0 },
    { name: "Venkatesh Iyer", role: "AR", creditPrice: 8.5 },
    { name: "Romario Shepherd", role: "AR", creditPrice: 7.0 },
    { name: "Swapnil Singh", role: "AR", creditPrice: 6.0 },
    { name: "Josh Hazlewood", role: "BOWL", creditPrice: 9.0 },
    { name: "Bhuvneshwar Kumar", role: "BOWL", creditPrice: 8.0 },
    { name: "Yash Dayal", role: "BOWL", creditPrice: 7.5 },
    { name: "Nuwan Thushara", role: "BOWL", creditPrice: 7.0 },
    { name: "Suyash Sharma", role: "BOWL", creditPrice: 6.5 },
    { name: "Rasikh Dar", role: "BOWL", creditPrice: 6.5 },
  ],
  SRH: [
    { name: "Travis Head", role: "BAT", creditPrice: 9.5 },
    { name: "Ishan Kishan", role: "WK", creditPrice: 9.0 },
    { name: "Heinrich Klaasen", role: "WK", creditPrice: 9.5 },
    { name: "Abhishek Sharma", role: "AR", creditPrice: 8.5 },
    { name: "Harshal Patel", role: "AR", creditPrice: 8.0 },
    { name: "Liam Livingstone", role: "AR", creditPrice: 9.0 },
    { name: "Nitish Kumar Reddy", role: "AR", creditPrice: 8.0 },
    { name: "Kamindu Mendis", role: "AR", creditPrice: 7.5 },
    { name: "Brydon Carse", role: "AR", creditPrice: 7.5 },
    { name: "Pat Cummins", role: "BOWL", creditPrice: 10.0 },
    { name: "Jaydev Unadkat", role: "BOWL", creditPrice: 7.0 },
    { name: "Shivam Mavi", role: "BOWL", creditPrice: 7.0 },
    { name: "Eshan Malinga", role: "BOWL", creditPrice: 6.0 },
    { name: "Zeeshan Ansari", role: "BOWL", creditPrice: 6.0 },
  ],
};

// ─── Real IPL 2026 Schedule (70 league matches) ───────────────────

interface MatchSeed {
  team1: string; // home team
  team2: string;
  date: string;  // YYYY-MM-DD
  time: string;  // HH:MM IST
  venue: string;
}

const SCHEDULE: MatchSeed[] = [
  // Match 1-10
  { team1: "RCB", team2: "SRH", date: "2026-03-28", time: "19:30", venue: "M. Chinnaswamy Stadium, Bengaluru" },
  { team1: "MI", team2: "KKR", date: "2026-03-29", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "RR", team2: "CSK", date: "2026-03-30", time: "19:30", venue: "ACA Cricket Stadium, Guwahati" },
  { team1: "PBKS", team2: "GT", date: "2026-03-31", time: "19:30", venue: "Maharaja Yadavindra Singh Stadium, Mullanpur" },
  { team1: "LSG", team2: "DC", date: "2026-04-01", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "KKR", team2: "SRH", date: "2026-04-02", time: "19:30", venue: "Eden Gardens, Kolkata" },
  { team1: "CSK", team2: "PBKS", date: "2026-04-03", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "DC", team2: "MI", date: "2026-04-04", time: "15:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "GT", team2: "RR", date: "2026-04-04", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "SRH", team2: "LSG", date: "2026-04-05", time: "15:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  // Match 11-20
  { team1: "RCB", team2: "CSK", date: "2026-04-05", time: "19:30", venue: "M. Chinnaswamy Stadium, Bengaluru" },
  { team1: "KKR", team2: "PBKS", date: "2026-04-06", time: "19:30", venue: "Eden Gardens, Kolkata" },
  { team1: "RR", team2: "MI", date: "2026-04-07", time: "19:30", venue: "ACA Cricket Stadium, Guwahati" },
  { team1: "DC", team2: "GT", date: "2026-04-08", time: "19:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "KKR", team2: "LSG", date: "2026-04-09", time: "19:30", venue: "Eden Gardens, Kolkata" },
  { team1: "RR", team2: "RCB", date: "2026-04-10", time: "19:30", venue: "ACA Cricket Stadium, Guwahati" },
  { team1: "PBKS", team2: "SRH", date: "2026-04-11", time: "15:30", venue: "Maharaja Yadavindra Singh Stadium, Mullanpur" },
  { team1: "CSK", team2: "DC", date: "2026-04-11", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "LSG", team2: "GT", date: "2026-04-12", time: "15:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "MI", team2: "RCB", date: "2026-04-12", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  // Match 21-30
  { team1: "SRH", team2: "RR", date: "2026-04-13", time: "19:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "CSK", team2: "KKR", date: "2026-04-14", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "RCB", team2: "LSG", date: "2026-04-15", time: "19:30", venue: "M. Chinnaswamy Stadium, Bengaluru" },
  { team1: "MI", team2: "PBKS", date: "2026-04-16", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "GT", team2: "KKR", date: "2026-04-17", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "RCB", team2: "DC", date: "2026-04-18", time: "15:30", venue: "M. Chinnaswamy Stadium, Bengaluru" },
  { team1: "SRH", team2: "CSK", date: "2026-04-18", time: "19:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "KKR", team2: "RR", date: "2026-04-19", time: "15:30", venue: "Eden Gardens, Kolkata" },
  { team1: "PBKS", team2: "LSG", date: "2026-04-19", time: "19:30", venue: "Maharaja Yadavindra Singh Stadium, Mullanpur" },
  { team1: "GT", team2: "MI", date: "2026-04-20", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  // Match 31-40
  { team1: "SRH", team2: "DC", date: "2026-04-21", time: "19:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "LSG", team2: "RR", date: "2026-04-22", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "MI", team2: "CSK", date: "2026-04-23", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "RCB", team2: "GT", date: "2026-04-24", time: "19:30", venue: "M. Chinnaswamy Stadium, Bengaluru" },
  { team1: "DC", team2: "PBKS", date: "2026-04-25", time: "15:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "RR", team2: "SRH", date: "2026-04-25", time: "19:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "GT", team2: "CSK", date: "2026-04-26", time: "15:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "LSG", team2: "KKR", date: "2026-04-26", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "DC", team2: "RCB", date: "2026-04-27", time: "19:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "PBKS", team2: "RR", date: "2026-04-28", time: "19:30", venue: "Maharaja Yadavindra Singh Stadium, Mullanpur" },
  // Match 41-50
  { team1: "MI", team2: "SRH", date: "2026-04-29", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "GT", team2: "RCB", date: "2026-04-30", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "RR", team2: "DC", date: "2026-05-01", time: "19:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "CSK", team2: "MI", date: "2026-05-02", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "SRH", team2: "KKR", date: "2026-05-03", time: "15:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "GT", team2: "PBKS", date: "2026-05-03", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "MI", team2: "LSG", date: "2026-05-04", time: "19:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "DC", team2: "CSK", date: "2026-05-05", time: "19:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "SRH", team2: "PBKS", date: "2026-05-06", time: "15:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "LSG", team2: "RCB", date: "2026-05-07", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  // Match 51-60
  { team1: "DC", team2: "KKR", date: "2026-05-08", time: "19:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "RR", team2: "GT", date: "2026-05-09", time: "19:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "CSK", team2: "LSG", date: "2026-05-10", time: "15:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "RCB", team2: "MI", date: "2026-05-10", time: "19:30", venue: "Nava Raipur Cricket Stadium, Nava Raipur" },
  { team1: "PBKS", team2: "DC", date: "2026-05-11", time: "19:30", venue: "HPCA Cricket Stadium, Dharamshala" },
  { team1: "GT", team2: "SRH", date: "2026-05-12", time: "19:30", venue: "Narendra Modi Stadium, Ahmedabad" },
  { team1: "RCB", team2: "KKR", date: "2026-05-13", time: "19:30", venue: "Nava Raipur Cricket Stadium, Nava Raipur" },
  { team1: "PBKS", team2: "MI", date: "2026-05-14", time: "19:30", venue: "HPCA Cricket Stadium, Dharamshala" },
  { team1: "LSG", team2: "CSK", date: "2026-05-15", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "KKR", team2: "GT", date: "2026-05-16", time: "19:30", venue: "Eden Gardens, Kolkata" },
  // Match 61-70
  { team1: "PBKS", team2: "RCB", date: "2026-05-17", time: "15:30", venue: "HPCA Cricket Stadium, Dharamshala" },
  { team1: "DC", team2: "RR", date: "2026-05-17", time: "19:30", venue: "Arun Jaitley Stadium, Delhi" },
  { team1: "CSK", team2: "SRH", date: "2026-05-18", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "RR", team2: "LSG", date: "2026-05-19", time: "19:30", venue: "Sawai Mansingh Stadium, Jaipur" },
  { team1: "KKR", team2: "MI", date: "2026-05-20", time: "19:30", venue: "Eden Gardens, Kolkata" },
  { team1: "CSK", team2: "GT", date: "2026-05-21", time: "19:30", venue: "MA Chidambaram Stadium, Chennai" },
  { team1: "SRH", team2: "RCB", date: "2026-05-22", time: "19:30", venue: "Rajiv Gandhi Intl Stadium, Hyderabad" },
  { team1: "LSG", team2: "PBKS", date: "2026-05-23", time: "19:30", venue: "Ekana Cricket Stadium, Lucknow" },
  { team1: "MI", team2: "RR", date: "2026-05-24", time: "15:30", venue: "Wankhede Stadium, Mumbai" },
  { team1: "KKR", team2: "DC", date: "2026-05-24", time: "19:30", venue: "Eden Gardens, Kolkata" },
];

// ─── Main Seed Function ───────────────────────────────────────────

async function seed() {
  console.log("Seeding IPL 2026 data (REAL schedule & squads)...\n");

  const now = new Date();

  // 1. Clear existing data for this season
  console.log("Clearing existing season data...");
  await prisma.playerMatchStats.deleteMany({});
  await prisma.contestEntry.deleteMany({});
  await prisma.contest.deleteMany({});
  // Saved teams store player selections as JSON that becomes stale whenever we re-seed players.
  // Delete saved teams for this season before deleting matches/players.
  await prisma.savedTeam.deleteMany({ where: { match: { season: SEASON } } });
  await prisma.match.deleteMany({ where: { season: SEASON } });
  await prisma.player.deleteMany({ where: { season: SEASON } });

  // 2. Seed players
  console.log("Seeding players...");
  let playerCount = 0;
  for (const [team, squad] of Object.entries(SQUADS)) {
    for (const player of squad) {
      await prisma.player.create({
        data: {
          name: player.name,
          team,
          role: player.role,
          creditPrice: player.creditPrice,
          season: SEASON,
        },
      });
      playerCount++;
    }
  }
  console.log(`  Created ${playerCount} players across ${Object.keys(SQUADS).length} teams`);

  // 3. Seed matches
  console.log("Seeding matches...");
  let upcomingCount = 0;
  let completedCount = 0;

  for (const match of SCHEDULE) {
    const [year, month, day] = match.date.split("-").map(Number);
    const [hours, minutes] = match.time.split(":").map(Number);
    // Create date in IST (UTC+5:30)
    const matchDate = new Date(`${match.date}T${match.time}:00+05:30`);

    // If match date + 4 hours has passed, mark as COMPLETED
    const fourHoursAfter = new Date(matchDate.getTime() + 4 * 60 * 60 * 1000);
    const status = fourHoursAfter < now ? "COMPLETED" : "UPCOMING";

    if (status === "COMPLETED") completedCount++;
    else upcomingCount++;

    await prisma.match.create({
      data: {
        team1: match.team1,
        team2: match.team2,
        date: matchDate,
        venue: match.venue,
        status,
        season: SEASON,
      },
    });
  }

  console.log(`  Created ${SCHEDULE.length} matches (${completedCount} completed, ${upcomingCount} upcoming)`);

  // 4. Summary
  console.log("\n--- Seed Summary ---");
  console.log(`Season: ${SEASON}`);
  console.log(`Teams: ${Object.keys(SQUADS).length}`);
  console.log(`Players: ${playerCount}`);
  console.log(`Matches: ${SCHEDULE.length}`);
  console.log(`  Completed: ${completedCount}`);
  console.log(`  Upcoming: ${upcomingCount}`);
  console.log("\nDone!");

  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
