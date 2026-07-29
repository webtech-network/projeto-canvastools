import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/** Asks a yes/no question in the terminal; anything but s/sim/y/yes counts as "no". */
export async function confirm(message) {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${message} `);
    return /^(s|sim|y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
