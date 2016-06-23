module.exports = {
  normalizeEntityName: function() {},

  afterInstall: function() {
    var blueprint = this;

    return blueprint.addBowerPackageToProject('pusher', '3.0.0').then(function() {
      return blueprint.addBowerPackageToProject('pusher-test-stub', '2.0.0');
    });
  }
};
