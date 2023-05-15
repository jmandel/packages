# `packages-minimal.json`

Provides the set of locations where each FHIR package has pre-release content available.

* `name` -- NPM package name (e.g., `hl7.fhir.us.core`)
* `current` -- official location for the main CI Build of the package. If you need to update this, submit a PR to edit this field
  * `url` -- package.tgz location
  * `repo` -- authoritative source control location for this package
  * `branch` -- authoritative branch for this package

Package resolvers should use `.current.url` when resolving a dependency like `"hl7.fhir.us.core": "#current"`.

# `considerations.json`

Lists potential location changes for packages tracked in the auto build system. This file is automatically populated and should be manually reviewed. On review, these changes can be:

* Accepted -- update `packages-minimal.json` with the new location for the package
* Rejected -- update `rejections.json` with the rejected location for this package

Either of these actions will cause the entry to be removed from `considerations.json` automatically.


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
