# Introduction

This API provides full access to the ListOfLinks database.

# Running Locally

First, create a `config.js` file to configure the PostgreSQL URI. See `config.sample.js` for an example.

Then run:

```
npm install
npm run start
npm run build-docs
```
`npm run buid-docs` will need to be run each time the template or api.raml is changed.

The `.travis.yml` file specifies a means for Travis-CI to automatically build the docs and upload them to an S3 bucket.
