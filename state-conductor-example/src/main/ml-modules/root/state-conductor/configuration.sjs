const configuration = {
  databases: {
    executions: 'state-conductor-executions',
    triggers: 'state-conductor-triggers',
    schemas: 'state-conductor-schemas',
  },
  collections: {
    item: 'state-conductor-item',
    execution: 'stateConductorExecution',
    stateMachine: 'state-conductor-state-machine',
  },
  URIPrefixes: {
    stateMachine: '/state-conductor-state-machine/',
    execution: '/stateConductorExecution/',
  },
  executionExpiration: {
    enabled: true,
    duration: 'P5D',
    status: ['complete', 'failed'],
    batchSize: 1000,
  },
};

module.exports = {
  configuration,
};
