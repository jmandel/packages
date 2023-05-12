# packages.json

The `packages.json` file provides the set of locations where each FHIR package has pre-release content available.

* `current` -- the official location for the main CI Build of the package. If you need to update this, submit a PR to edit this field
* `locations` -- list of all locations where this package has CI Build content available. This includes feature branches and forks

Package resolvers should use `current` when resolving a dependency like `"hl7.fhir.us.core": "#current"`.


---

## Reporting on ambiguous packages

```
cat packages.json | jq '
[
  .[]
  | del(.current)
  | .locations = (
      .locations
      | map(del(.url) | select(.branch == "main" or .branch == "master"))
  )
  | select(.locations | length >= 2)
  | select(all(.locations[]; .lastSeen | startswith("2023")))
]' > ambiguous-packages.json
```
