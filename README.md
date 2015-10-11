# Tutor-Slave

The Tutor-Slave webservice processes exercises after they are handed in. It generates a PDF and runs all the tests in a sandboxed environment.

## Installation

this package requires node `v0.12.7`. You cannot install it with newer node
version (>v4) as contextify will fail to build. Install via

```
npm install
```

## Start the server

You can start the server with an exemplary in memory database simply via

```
node index.js
```
