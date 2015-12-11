
module.exports = function(config) {
  // memory database is not maintained anymore
  /*
  if(config.development && !config.devrdb){
    console.log("### development environment ###");
    return Promise.resolve(require("@tutor/memory-database")(config));
  } else {
    console.log("### development environment with RethinkDB @" +
      config.database.host + ":" + config.database.port + "/" + config.database.name + " ###")
    return (require("@tutor/rethinkdb-database"))(config);
  }
  */
  if(process.env.RETHINKDB_PORT_28015_TCP_ADDR) {
    config.database.host = process.env.RETHINKDB_PORT_28015_TCP_ADDR;
  }
  if(process.env.RETHINKDB_PORT_28015_TCP_PORT) {
    config.database.port = parseInt(process.env.RETHINKDB_PORT_28015_TCP_PORT);
  }
  console.log("### development environment with RethinkDB @" +
    config.database.host + ":" + config.database.port + "/" + config.database.name + " ###")
  return (require("@tutor/rethinkdb-database"))(config);
}
