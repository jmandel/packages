# packages.json

The `packages.json` file provides the set of locations where each FHIR package has pre-release content available.

* `current` -- the official location for the main CI Build of the package. If you need to update this, submit a PR to edit this field
* `locations` -- list of all locations where this package has CI Build content available. This includes feature branches and forks

Package resolvers should use `current` when resolving a dependency like `"hl7.fhir.us.core": "#current"`.

