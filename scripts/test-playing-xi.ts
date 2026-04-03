import assert from "node:assert/strict";
import { __internal } from "@/lib/playing-xi";

const cricbuzzFixture = `
  <div>
    <p>Chennai Super Kings (Playing XI): Ruturaj Gaikwad, Devon Conway, Rahul Tripathi, Shivam Dube, Ravindra Jadeja, MS Dhoni (wk), Ravichandran Ashwin, Noor Ahmad, Matheesha Pathirana, Khaleel Ahmed, Mukesh Choudhary</p>
    <p>Punjab Kings (Playing XI): Priyansh Arya, Prabhsimran Singh (wk), Shreyas Iyer (c), Glenn Maxwell, Marcus Stoinis, Shashank Singh, Marco Jansen, Yuzvendra Chahal, Arshdeep Singh, Lockie Ferguson, Harpreet Brar</p>
  </div>
`;

const espnFixture = `
  <section>
    <div>Sunrisers Hyderabad (Playing XI): Travis Head, Abhishek Sharma, Ishan Kishan (wk), Nitish Kumar Reddy, Heinrich Klaasen, Aniket Verma, Pat Cummins (c), Harshal Patel, Mohammed Shami, Rahul Chahar, Adam Zampa</div>
    <div>Kolkata Knight Riders (Playing XI): Quinton de Kock (wk), Sunil Narine, Ajinkya Rahane (c), Venkatesh Iyer, Rinku Singh, Andre Russell, Ramandeep Singh, Harshit Rana, Vaibhav Arora, Varun Chakaravarthy, Spencer Johnson</div>
  </section>
`;

const players = [
  { id: "1", name: "MS Dhoni", team: "CSK", season: "IPL 2026" },
  { id: "2", name: "Ravindra Jadeja", team: "CSK", season: "IPL 2026" },
  { id: "3", name: "Matheesha Pathirana", team: "CSK", season: "IPL 2026" },
  { id: "4", name: "Noor Ahmad", team: "CSK", season: "IPL 2026" },
  { id: "5", name: "Rahul Tripathi", team: "CSK", season: "IPL 2026" },
  { id: "6", name: "Ruturaj Gaikwad", team: "CSK", season: "IPL 2026" },
  { id: "7", name: "Devon Conway", team: "CSK", season: "IPL 2026" },
  { id: "8", name: "Shivam Dube", team: "CSK", season: "IPL 2026" },
  { id: "9", name: "Ravichandran Ashwin", team: "CSK", season: "IPL 2026" },
  { id: "10", name: "Khaleel Ahmed", team: "CSK", season: "IPL 2026" },
  { id: "11", name: "Mukesh Choudhary", team: "CSK", season: "IPL 2026" },
];

const cricbuzzSections = __internal.extractPlayingXISections(cricbuzzFixture);
assert.equal(cricbuzzSections.length, 2);
assert.equal(cricbuzzSections[0].players.length, 11);
assert.equal(cricbuzzSections[1].players.length, 11);

const espnSections = __internal.extractPlayingXISections(espnFixture);
assert.equal(espnSections.length, 2);
assert.equal(espnSections[0].players[2], "Ishan Kishan");
assert.equal(espnSections[1].players[9], "Varun Chakaravarthy");

const playerMatch = __internal.matchScrapedNamesToPlayers(cricbuzzSections[0].players, players);
assert.equal(playerMatch.matchedIds.length, 11);
assert.deepEqual(playerMatch.unmatchedNames, []);

console.log("Playing XI parser checks passed");
