
module.exports = function(config) {
  if(config.development){
    return require("@tutor/memory-database")(config);
  } else {
    return require("@tutor/rethinkdb-database")(config);
  }
}
