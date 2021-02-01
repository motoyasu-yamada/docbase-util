import { DocbaseClient } from "./docbase-client";
import readline from "readline-sync";
import { removeConfig } from "./config";

const client = new DocbaseClient(removeConfig);

main();

async function main(): Promise<void> {
  const query = await readline.question("Query?");

  const result = await client.getPosts(query, 0, 100);
  console.log(result.posts.map((_) => _.title));

  const answer = await readline.question(
    'Remove? if you want please type "remove them"'
  );
  if (answer != "remove them") {
    console.log("Aborted");
    return;
  }

  await Promise.all(
    result.posts.map(async ({ id, title }) => {
      await client.deletePost(id);
      console.log(`deleted ${id}: ${title}`);
    })
  );
}
