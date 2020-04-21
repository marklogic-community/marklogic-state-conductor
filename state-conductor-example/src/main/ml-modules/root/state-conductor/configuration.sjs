const configuration = {
  databases: {
    jobs: 'state-conductor-jobs',
    triggers: 'state-conductor-triggers',
    schemas: 'state-conductor-schemas',
  },
  collections: {
    item: 'state-conductor-item',
    job: 'stateConductorJob',
    flow: 'state-conductor-flow',
  },
  URIPrefixes: {
    flow: '/state-conductor-flow/',
    job: '/stateConductorJob/',
  },
};

module.exports = {
  configuration,
};
