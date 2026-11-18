
const DailyInspiration = require("./dailyInspiration.model");

// Get today's date using India Standard Time.
const getISTDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
};

// Curated content used for Technology and Science,
// and as a backup if the external API fails.
const fallbackInspirations = [
  {
    category: "Motivation",
    content: "Great things are done by a series of small things brought together.",
    author: "Vincent van Gogh",
    source: "Local Inspiration",
  },
  {
    category: "Technology",
    content: "The first computer bug was an actual moth found in a computer in 1947.",
    author: "Computing History",
    source: "Local Inspiration",
  },
  {
    category: "Science",
    content: "Light from the Sun takes approximately 8 minutes and 20 seconds to reach Earth.",
    author: "Science Fact",
    source: "Local Inspiration",
  },
  {
    category: "Motivation",
    content: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    source: "Local Inspiration",
  },
  {
    category: "Technology",
    content: "The first website went live in 1991 and explained the World Wide Web.",
    author: "Web History",
    source: "Local Inspiration",
  },
  {
    category: "Science",
    content: "A day on Venus is longer than its year.",
    author: "Astronomy Fact",
    source: "Local Inspiration",
  },
  {
    category: "Motivation",
    content: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    source: "Local Inspiration",
  },
  {
    category: "Technology",
    content: "The first electronic general-purpose computer, ENIAC, was completed in 1945.",
    author: "Computing History",
    source: "Local Inspiration",
  },
  {
    category: "Science",
    content: "Neutron stars are so dense that a teaspoon of their material would weigh billions of tonnes.",
    author: "Astronomy Fact",
    source: "Local Inspiration",
  },
];

// Choose a category based on the calendar date.
// The same date always produces the same category.
const getDayOfYear = (date) => {
  const current = new Date(`${date}T00:00:00Z`);
  const start = new Date(`${date.slice(0, 4)}-01-01T00:00:00Z`);

  return Math.floor(
    (current - start) / (24 * 60 * 60 * 1000)
  );
};


const getDailyCategoryIndex = (date) => {
  const startDate = new Date("2026-11-16T00:00:00Z");
  const currentDate = new Date(`${date}T00:00:00Z`);

  const daysSinceLaunch = Math.floor(
    (currentDate - startDate) / (24 * 60 * 60 * 1000)
  );

  // First 7 days: Motivation
  if (daysSinceLaunch < 7) {
    return 0;
  }

  // After 7 days: Technology and Science alternate
  return 1 + ((daysSinceLaunch - 7) % 2);
};

const getFallbackInspiration = (date) => {
  const categoryIndex = getDailyCategoryIndex(date);
  const category = ["Motivation", "Technology", "Science"][categoryIndex];

  const matchingItems = fallbackInspirations.filter(
    (item) => item.category === category
  );

  const dayNumber = getDayOfYear(date);
  const selectedItem = matchingItems[
    Math.floor((dayNumber - 1) / 3) % matchingItems.length
  ];

  return selectedItem;
};

// Fetch a motivational quote from ZenQuotes.
const fetchExternalQuote = async () => {
  const response = await fetch("https://zenquotes.io/api/random", {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`ZenQuotes API returned ${response.status}`);
  }

  const data = await response.json();
  const quote = Array.isArray(data) ? data[0] : null;

  if (
    !quote ||
    typeof quote.q !== "string" ||
    !quote.q.trim() ||
    !quote.a ||
    quote.a === "zenquotes.io"
  ) {
    throw new Error("Invalid quote received from external API");
  }

  return {
    category: "Motivation",
    content: quote.q.trim(),
    author: quote.a.trim(),
    source: "ZenQuotes",
  };
};

// Main service function.
const getDailyInspiration = async () => {
  const today = getISTDate();

  // 1. Check whether today's item is already stored.
  const existingInspiration = await DailyInspiration.findOne({
    date: today,
  }).lean();

  if (existingInspiration) {
    return existingInspiration;
  }

  // 2. Select the category for today.
  const categoryIndex = getDailyCategoryIndex(today);
  let inspiration;

  // 3. Fetch an external quote on Motivation days.
  if (categoryIndex === 0) {
    try {
      inspiration = await fetchExternalQuote();
    } catch (error) {
      console.error("Daily Inspiration API fallback:", error.message);
      inspiration = getFallbackInspiration(today);
    }
  } else {
    // Technology and Science use curated content.
    inspiration = getFallbackInspiration(today);
  }

  // 4. Store today's item.
  try {
    return await DailyInspiration.findOneAndUpdate(
      { date: today },
      {
        $setOnInsert: {
          date: today,
          ...inspiration,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).lean();
  } catch (error) {
    // If simultaneous requests race to create the same date,
    // retrieve the record created by the other request.
    if (error.code === 11000) {
      const savedInspiration = await DailyInspiration.findOne({
        date: today,
      }).lean();

      if (savedInspiration) {
        return savedInspiration;
      }
    }

    throw error;
  }
};

module.exports = {
  getDailyInspiration,
};
