module.exports = {
  normalizeEntityName: function() {},

  afterInstall: function() {
    var blueprint = this;

    return blueprint.addPackageToProject('pusher-js', '3.0.0');
  }
};
