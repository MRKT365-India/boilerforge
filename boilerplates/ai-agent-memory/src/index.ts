import { LongTermMemory } from './memory/long-term';

async function main() {
  const memory = new LongTermMemory();
  await memory.store('User prefers dark mode', 0.8);
  await memory.store('User is building a Shopify app', 0.9);
  const results = await memory.search('What is the user building?');
  console.log('Relevant memories:', results.map(m => m.content));
}

main();
