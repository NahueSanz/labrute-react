import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import {
  adjectives, animals, colors, languages, names, starWars, uniqueNamesGenerator,
} from 'unique-names-generator';
import { GLOBAL, ServerContext } from './context.js';
import { generateBot } from './utils/brute/generateBot.js';

dayjs.extend(utc);

const BOTS_PER_LEVEL = 18;
const MAX_BOT_LEVEL = 200;
const TOTAL_BOTS = BOTS_PER_LEVEL * MAX_BOT_LEVEL;

async function main(cx: ServerContext) {
  // Check if DB is already seeded
  const count = await cx.prisma.brute.count({
    where: { userId: null },
  });

  if (count >= TOTAL_BOTS) {
    return;
  }

  // Setting old generated brutes as deleted
  await cx.prisma.brute.updateMany({
    where: { userId: null },
    data: { deletedAt: dayjs.utc().toDate() },
  });

  // Generate random names
  cx.logger.log(`DB only contains ${count} generated brutes, regenerating ${TOTAL_BOTS}...`);
  const nicks: string[] = [];

  for (let i = 0; i < TOTAL_BOTS; i++) {
    let generatedName;

    // Reroll if name already exists
    while (!generatedName || nicks.includes(generatedName)) {
      generatedName = uniqueNamesGenerator({
        dictionaries: [colors, adjectives, animals, names, languages, starWars],
        style: 'capital',
        separator: '',
        length: 2,
      }).replace(/\s/g, '').substring(0, 16);
    }

    nicks.push(generatedName);

    await cx.prisma.brute.create({
      data: generateBot(Math.floor(i / BOTS_PER_LEVEL) + 1, generatedName),
    });
  }
}

/**
 * Initialize the global context, then run `main`
 */
async function mainWrapper() {
  await using context = GLOBAL;
  await main(context);
}

await mainWrapper();
