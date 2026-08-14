/**
 * The canonical system design interview problem set, graded by difficulty.
 *
 * Problem list follows the widely used grading in
 * https://github.com/ashishps1/awesome-system-design-resources - only the problem names are
 * used here, as prompts for the generator. Ordering within each tier is deliberate: the
 * earlier entries need fewer moving parts, so working down a tier is a sensible study path.
 */
export type PromptDifficulty = "Easy" | "Medium" | "Hard";

export type PromptGroup = {
  difficulty: PromptDifficulty;
  blurb: string;
  prompts: string[];
};

export const promptLibrary: PromptGroup[] = [
  {
    difficulty: "Easy",
    blurb: "Single dominant constraint, few components",
    prompts: [
      "Design URL Shortener like TinyURL",
      "Design Autocomplete for Search Engines",
      "Design Load Balancer",
      "Design Content Delivery Network (CDN)",
      "Design Parking Garage",
      "Design Vending Machine",
      "Design Distributed Key-Value Store",
      "Design Distributed Cache",
      "Design Authentication System",
      "Design Unified Payments Interface (UPI)",
    ],
  },
  {
    difficulty: "Medium",
    blurb: "Multiple services, fanout and consistency concerns",
    prompts: [
      "Design WhatsApp",
      "Design Instagram",
      "Design Twitter",
      "Design Reddit",
      "Design Facebook",
      "Design Netflix",
      "Design Youtube",
      "Design Spotify",
      "Design TikTok",
      "Design Tinder",
      "Design Airbnb",
      "Design Shopify",
      "Design E-commerce Store like Amazon",
      "Design Google Search",
      "Design Rate Limiter",
      "Design Notification Service",
      "Design Distributed Job Scheduler",
      "Design Distributed Message Queue like Kafka",
      "Design Flight Booking System",
      "Design Online Code Editor",
      "Design an Analytics Platform (Metrics & Logging)",
      "Design Payment System",
      "Design a Digital Wallet",
    ],
  },
  {
    difficulty: "Hard",
    blurb: "Geospatial, realtime collaboration or storage at scale",
    prompts: [
      "Design Uber",
      "Design Location Based Service like Yelp",
      "Design Food Delivery App like Doordash",
      "Design Google Maps",
      "Design Google Docs",
      "Design Zoom",
      "Design File Sharing System like Dropbox",
      "Design Ticket Booking System like BookMyShow",
      "Design Distributed Web Crawler",
      "Design Code Deployment System",
      "Design Distributed Cloud Storage like S3",
      "Design Distributed Locking Service",
    ],
  },
];

/** Flat list, used where there is only room for a single row of suggestions. */
export const allPrompts: string[] = promptLibrary.flatMap((group) => group.prompts);
