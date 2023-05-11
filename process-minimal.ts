import _ from "npm:lodash";

interface InputItem {
  "package-id": string;
  repo: string;
  date: string;
}

interface Location {
  url: string;
  repo?: string;
  branch?: string;
  lastSeen?: Date;
}

interface OutputItem {
  name: string;
  locations: Location[];
  current: string;
}

function readJson(path: string) {
  return JSON.parse(Deno.readTextFileSync(path));
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

let previousPackages: OutputItem[];
try {
  previousPackages = await readJson("packages-minimal.json");
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    previousPackages = [];
  } else {
    throw error;
  }
}

const qaData: InputItem[] = await readJson("qas.json");
const score = (location: Location) => {
  const branchScore = (location.branch === "main" || location.branch === "master") ? 1 : 0;
  return (branchScore * 1e10 + location.lastSeen!.getTime() / 10e10);
};

const packagesFrom = (previousPackages) =>  _.chain(qaData)
  .map((v: InputItem) => ({
    name: v["package-id"],
    location: extractLocation(v.repo, v.date),
  }))
  .groupBy("name")
  .map((v: InputItem[], name: string) => ({
    name,
    current: {...(_.chain(v).map("location").maxBy(score).value()), lastSeen: undefined},
  }))
  .differenceBy(Object.values(previousPackages), "name")
  .concat(previousPackages)
  .sortBy("name")
  .value();

await Deno.writeTextFile(
  "packages-minimal.json",
  JSON.stringify(packagesFrom(previousPackages), null, 2),
);

await Deno.writeTextFile(
  "packages-minimal-from-start.json",
  JSON.stringify(packagesFrom([]), null, 2),
);

console.log("Output file updated: packages-minimal.json");
