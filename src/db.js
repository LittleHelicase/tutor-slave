
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
  console.log("### development environment with RethinkDB @" +
    config.database.host + ":" + config.database.port + "/" + config.database.name + " ###")
  return (require("@tutor/rethinkdb-database"))(config);
}
