import _ from "npm:lodash";

// Define the interfaces
interface InputItem {
  "package-id": string;
  repo: string;
}

interface Location {
  url: string;
  repo?: string;
  branch?: string;
}

interface OutputItem {
  name: string;
  locations: Location[];
  current: string;
}

interface Output {
  [key: string]: OutputItem;
}

function readJson(path: string) {
  return JSON.parse(Deno.readTextFileSync(path))
}

function extractLocation(repo: string, date: string): Location {
  const segments = repo.split("/");
  const org = segments[0];
  const repoName = segments[1];
  const branch = segments[3];

  const url = `https://build.fhir.org/ig/${org}/${repoName}/branches/${branch}/package.tgz`;
  const repoUrl = `https://github.com/${org}/${repoName}`;

  return {
    url,
    repo: repoUrl,
    branch,
    lastSeen: new Date(date),

  };
}

const data: InputItem[] = await readJson("qas.json");

let output: Output;
try {
  output = await readJson("packages.json");
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    output = {};
  } else {
    throw error;
  }
}

output = _.reduce(
  data,
  (accumulator: Output, item: InputItem) => {
    const name = item["package-id"];
    const location = extractLocation(item.repo, item.date);

    if (accumulator[name]) {
      accumulator[name].locations = _.chain(accumulator[name].locations)
            .concat([location])
            .groupBy("url")
            .map((group) => _.maxBy(group, "lastSeen"))
            .value();

    } else {
      accumulator[name] = {
        name,
        locations: [location],
        added: true
      };
    }

    return accumulator;
  },
  output
);

Object.values(output).filter(o => o.added).forEach(packageItem => {
  packageItem.current = _.maxBy(packageItem.locations, (location: Location) => {
    const branchScore = (location.branch === "main" || location.branch === "master") ? 1 : 0;
    return (branchScore * 1e10 + location.lastSeen.getTime() / 10e10);
  })?.url;
  delete packageItem.added;
})

const sortedOutput: Output = _.fromPairs(_.sortBy(_.toPairs(output), ([key]) => key));
await Deno.writeTextFile("packages.json", JSON.stringify(sortedOutput, null, 2));
console.log("Output file updated: packages.json");
