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
  current: Location
}

function readJson(path: string, defaultJson = []) {
try {
    return JSON.parse(Deno.readTextFileSync(path));
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    return defaultJson
  } else {
    throw error;
  }
}
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

const previousPackages: OutputItem[] = await readJson("packages-minimal.json");

const qaData: InputItem[] = await readJson("qas.json");
const score = (location: Location) => {
  const branchScore = (location.branch === "main" || location.branch === "master") ? 1 : 0;
  return (branchScore * 1e10 + location.lastSeen!.getTime() / 10e10);
};

const packagesFrom = (previousPackages: OutputItem[]): OutputItem[] =>  _.chain(qaData)
  .map((v: InputItem) => ({
    name: v["package-id"],
    location: extractLocation(v.repo, v.date),
  }))
  .groupBy("name")
  .map((v: InputItem[], name: string) => ({
    name,
    current: (_.chain(v).map("location").maxBy(score).value())
  }))
  .map((i: OutputItem) => {
    delete i.current["lastSeen"];
    return i
  })
  .differenceBy(Object.values(previousPackages), "name")
  .concat(previousPackages)
  .sortBy("name")
  .value();

const packagesOutput = packagesFrom(previousPackages)
await Deno.writeTextFile(
  "packages-minimal.json",
  JSON.stringify(packagesOutput, null, 2),
);

const packagesFromStart = packagesFrom([])

interface Rejection {
  name: string,
  locationUrl: string
}
const rejections: OutputItem[] = readJson("rejections.json");
const newConsiderations = _.chain(packagesFromStart).differenceWith(packagesOutput, _.isEqual).differenceWith(rejections, _.isEqual).value();
// console.log("fromsTart", packagesFromStart);
console.log("diffs", _.chain(packagesFromStart).differenceWith(packagesOutput, _.isEqual).value())

await Deno.writeTextFile(
  "considerations.json",
  JSON.stringify(newConsiderations, null, 2),
);



console.log("Output file updated: packages-minimal.json");
