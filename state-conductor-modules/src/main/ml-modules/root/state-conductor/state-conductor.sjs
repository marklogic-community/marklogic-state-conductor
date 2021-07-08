'use strict';

const op = require('/MarkLogic/optic');
const lib = require('/state-conductor/state-conductor-lib.sjs');

const configuration = lib.getConfiguration();

// configurable //
const STATE_CONDUCTOR_EXECUTIONS_DB = configuration.databases.executions;
const STATE_CONDUCTOR_TRIGGERS_DB = configuration.databases.triggers;
const STATE_CONDUCTOR_SCHEMAS_DB = configuration.databases.schemas;
const STATE_MACHINE_ITEM_COLLECTION = configuration.collections.item;
const EXECUTION_COLLECTION = configuration.collections.execution;
const STATE_MACHINE_COLLECTION = configuration.collections.stateMachine;
const STATE_MACHINE_DIRECTORY = configuration.URIPrefixes.stateMachine;
const EXECUTION_DIRECTORY = configuration.URIPrefixes.execution;

// non-configurable //
const EXECUTION_DOC_READ_PERMISSION = 'state-conductor-reader-role';
const EXECUTION_DOC_WRITE_PERMISSION = 'state-conductor-execution-writer-role';
const TRACE_EVENT = 'state-conductor';
const STATE_MACHINE_FILE_EXTENSION = '.asl.json';
const STATE_MACHINE_EXECUTIONID_PROP_NAME = 'state-conductor-execution';
const STATE_MACHINE_STATUS_NEW = 'new';
const STATE_MACHINE_STATUS_WORKING = 'working';
const STATE_MACHINE_STATUS_WAITING = 'waiting';
const STATE_MACHINE_STATUS_COMPLETE = 'complete';
const STATE_MACHINE_STATUS_FAILED = 'failed';
const STATE_MACHINE_NEW_STEP = 'NEW';
const DATE_TIME_REGEX =
  '^[-]?((1[6789]|[2-9][0-9])[0-9]{2}-(0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01]))T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|.[0-9]{4}|[-|+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?((1[6789]|[2-9][0-9])[0-9]{2}-(0[469]|11)-(0[1-9]|[12][0-9]|30))T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|.[0-9]{4}|[-|+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?((16|[248][048]|[3579][26])00)|(1[6789]|[2-9][0-9])(0[48]|[13579][26]|[2468][048])-02-(0[1-9]|1[0-9]|2[0-9])T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|.[0-9]{4}|[-|+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?(1[6789]|[2-9][0-9])[0-9]{2}-02-(0[1-9]|1[0-9]|2[0-8])T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|.[0-9]{4}|[-|+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$';

const DEFAULT_MAX_RETRY_ATTEMPTS = 3;
const STATE_CHOICE = 'choice';
const STATE_FAIL = 'fail';
const STATE_PASS = 'pass';
const STATE_SUCCEED = 'succeed';
const STATE_TASK = 'task';
const STATE_WAIT = 'wait';

const SUPPORTED_STATE_TYPES = [
  STATE_CHOICE,
  STATE_FAIL,
  STATE_PASS,
  STATE_SUCCEED,
  STATE_TASK,
  STATE_WAIT,
];

const parseSerializedQuery = (serializedQuery) => {
  return cts.query(fn.head(xdmp.fromJsonString(serializedQuery)));
};

/**
 * This function should be called when ever we are
 * invoking for the executions/content database.
 * Since now its possible that they are
 * already with in that database
 * @param {*} name
 * @returns
 */
function invokeOrApplyFunction(functionIn, optionsIn) {
  // is used incase they dont set one of these
  // often tiems the moduels database isnt set
  const defaultOptions = {
    database: xdmp.database(),
    modules: xdmp.modulesDatabase(),
  };
  const options = Object.assign(defaultOptions, optionsIn);

  if (
    options.database.toString() === xdmp.database().toString() &&
    options.modules.toString() === xdmp.modulesDatabase().toString()
  ) {
    //the content and the modules database are already in this context
    //we just apply the function and convert it to a sequence so that it makes the invoke function
    return fn.subsequence(functionIn(), 1);
  } else {
    //either the content or the modules database doesnt match
    //so we just call invokefunction
    return xdmp.invokeFunction(functionIn, options);
  }
}

/**
 * Gets a stateMachine definition by name
 *
 * @param {*} name
 * @returns the stateMachine document or null if not found
 */
function getStateMachine(name) {
  let nameWithExtension = fn.normalizeSpace(name) + STATE_MACHINE_FILE_EXTENSION;
  const uri = fn.head(
    cts.uriMatch(
      '*' + nameWithExtension,
      ['document', 'case-sensitive'],
      cts.collectionQuery(STATE_MACHINE_COLLECTION)
    )
  );

  return uri ? cts.doc(uri) : null;
}

/**
 * Gets a stateMachine definition by name from the given database.
 * Throws an error if not found
 *
 * @param {*} name
 * @param {*} databaseId
 * @returns
 */
function getStateMachineFromDatabase(name, databaseId) {
  let resp = invokeOrApplyFunction(
    () => {
      let stateMachine = getStateMachine(name);
      if (!stateMachine) {
        fn.error(
          null,
          'MISSING-STATE-MACHINE-FILE',
          `Cannot find a stateMachine file with the name: ${name}`
        );
      }
      return stateMachine;
    },
    {
      database: databaseId,
    }
  );
  return fn.head(resp);
}

/**
 * Gets all stateMachine definition documents
 *
 * @returns
 */
function getStateMachines() {
  return fn.collection(STATE_MACHINE_COLLECTION);
}

/**
 * Gets all stateMachine definition names
 *
 * @returns
 */
function getStateMachineNames() {
  return cts
    .uris('/', ['document'], cts.collectionQuery(STATE_MACHINE_COLLECTION))
    .toArray()
    .map((uri) => getStateMachineNameFromUri(uri));
}

/**
 * Given a stateMachine definition URI, determine it's stateMachine name
 *
 * @param {*} uri
 * @returns
 */
function getStateMachineNameFromUri(uri) {
  uri = uri.toString();
  uri = uri.slice(uri.lastIndexOf('/') + 1);
  return uri.lastIndexOf(STATE_MACHINE_FILE_EXTENSION) !== -1
    ? uri.slice(0, uri.lastIndexOf(STATE_MACHINE_FILE_EXTENSION))
    : uri;
}

/**
 * Create or update a state machine with the given name and definition.
 * Assumes the definition has already been validated.
 *
 * @param {*} name
 * @param {*} definitionJson
 * @returns
 */
function createStateMachine(name, definitionJson) {
  const uri = `${STATE_MACHINE_DIRECTORY}${name}${STATE_MACHINE_FILE_EXTENSION}`;
  xdmp.documentInsert(uri, definitionJson, {
    permissions: xdmp.defaultPermissions(),
    collections: [STATE_MACHINE_COLLECTION],
  });
  return uri;
}

/**
 * Returns the initial state for the given state machine definition
 *
 * @param {*} { name, StartAt }
 * @returns
 */
function getInitialState({ name, StartAt }) {
  if (!StartAt || StartAt.length === 0) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `no "StartAt" defined for state machine "${name}"`);
  }
  return StartAt;
}

/**
 * Gets the value of the property which links a document to a State Conductor execution
 *
 * @param {*} uri
 * @param {*} name
 * @returns
 */
function getExecutionMetadataProperty(uri, name) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  if (fn.docAvailable(uri)) {
    return xdmp
      .documentGetProperties(uri, fn.QName('', STATE_MACHINE_EXECUTIONID_PROP_NAME))
      .toArray()
      .filter((prop) => {
        return !name || prop.getAttributeNode('stateMachine-name').nodeValue === name;
      });
  }
  return [];
}

/**
 * Links the given document to a state conductor execution
 *
 * @param {*} uri
 * @param {*} name
 * @param {*} executionId
 */
function addExecutionMetadata(uri, name, executionId) {
  const builder = new NodeBuilder();
  builder.startElement(STATE_MACHINE_EXECUTIONID_PROP_NAME);
  builder.addAttribute('stateMachine-name', name);
  builder.addAttribute('execution-id', executionId);
  builder.addAttribute('date', xs.string(fn.currentDateTime()));
  builder.endElement();
  let executionMetaElem = builder.toNode();
  xdmp.documentAddProperties(uri, [executionMetaElem]);
}

/**
 * Get a list of execution id's for a given document.
 *
 * @param {*} uri
 * @param {*} name
 * @returns
 */
function getExecutionIds(uri, name) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const executionProps = getExecutionMetadataProperty(uri, name);
  return executionProps.map((prop) => prop.getAttributeNode('execution-id').nodeValue);
}

/**
 * Get execution documents for the given uri. Optionally include
 * "historic" execution documents - eg: executions which have processed
 * a document at this uri, regardless of whether that document contains
 * execution metadata properties linking it to that execution.
 *
 * @param {*} uri - document uri
 * @param {*} name - state machine name
 * @param {boolean} [includeHistoric=false]
 * @returns
 */
function getExecutionsForUri(uri, name, includeHistoric = false) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const executionIds = getExecutionIds(uri);
  const searchFilter = includeHistoric
    ? cts.jsonPropertyValueQuery('uri', uri)
    : cts.jsonPropertyValueQuery('id', executionIds);
  const executions = invokeOrApplyFunction(
    () => {
      return op
        .fromSearch(
          cts.andQuery([
            cts.collectionQuery(EXECUTION_COLLECTION),
            name ? cts.jsonPropertyValueQuery('name', name) : cts.trueQuery(),
            searchFilter,
          ]),
          ['fragmentId']
        )
        .joinDocUri('uri', op.fragmentIdCol('fragmentId'))
        .joinDoc('doc', op.fragmentIdCol('fragmentId'))
        .result();
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );
  return executions.toArray();
}

/**
 * Determines if the given document matches the given stateMachine's context
 *
 * @param {*} uri
 * @param {*} stateMachine
 * @returns
 */
function checkStateMachineContext(uri, stateMachine) {
  if (fn.docAvailable(uri)) {
    const query = getStateMachineContextQuery(stateMachine);
    const uris = cts.uris('', 'limit=1', cts.andQuery([cts.documentQuery(uri), query]));
    return uri === fn.string(fn.head(uris));
  }

  return false;
}

/**
 * Given a document's uri, finds all the stateMachines whose context applies,
 * and which have not previously processed this document.
 *
 * @param {*} uri
 * @returns
 */
function getApplicableStateMachines(uri) {
  const stateMachines = getStateMachines()
    .toArray()
    .filter((stateMachine) => {
      let name = getStateMachineNameFromUri(fn.documentUri(stateMachine));
      let stateMachineOjb = stateMachine.toObject();
      return (
        getExecutionIds(uri, name).length === 0 && checkStateMachineContext(uri, stateMachineOjb)
      );
    });

  return stateMachines;
}

/**
 * Given a stateMachine, generate a cts query for it's context
 *
 * @param {*} stateMachine
 * @returns
 */
function getStateMachineContextQuery(stateMachine) {
  const domain = stateMachine.mlDomain;
  const context = domain.context || [];
  let queries = context.map((ctx) => {
    if (ctx.scope === 'collection') {
      return cts.collectionQuery(ctx.value);
    } else if (ctx.scope === 'directory') {
      return cts.directoryQuery(ctx.value, 'infinity');
    } else if (ctx.scope === 'query') {
      return parseSerializedQuery(ctx.value);
    }
    return cts.falseQuery();
  });

  if (queries.length > 1) {
    queries = cts.orQuery(queries);
  } else if (queries.length < 1) {
    queries = cts.falseQuery();
  } else {
    queries = queries.pop();
  }

  return queries;
}

/**
 * Generate a cts query matching the context of all stateMachines
 *
 * @returns
 */
function getAllStateMachinesContextQuery() {
  let queries = getStateMachines()
    .toArray()
    .map((stateMachine) => getStateMachineContextQuery(stateMachine.toObject()));

  if (queries.length === 0) {
    queries = cts.falseQuery();
  } else if (queries.length === 1) {
    queries = queries.pop();
  } else {
    queries = cts.orQuery(queries);
  }

  return queries;
}

/**
 * Given a state machine name, find the documents matching it's defined context.
 * Optionally exclude documents have already be processed by this state machine as
 * indicated by the property metadata.
 *
 * @param {*} name - the name of the flow
 * @param {boolean} [includeAlreadyProcessed=false] - should we include already processed docs
 * @param {number} [limit=1000] - the number of documents to find
 * @returns a sequence of matching document URIs
 */
function findStateMachineTargets(name, includeAlreadyProcessed = false, limit = 1000) {
  const sm = getStateMachineFromDatabase(name, xdmp.database());

  // find documents matching the state machine's context query,
  const ctxquery = getStateMachineContextQuery(sm.toObject());
  const queries = [ctxquery];

  // optionally eliminate documents already processed by this state machine
  if (!includeAlreadyProcessed) {
    queries.push(
      cts.notQuery(
        cts.propertiesFragmentQuery(
          cts.elementAttributeValueQuery(
            STATE_MACHINE_EXECUTIONID_PROP_NAME,
            'stateMachine-name',
            name
          )
        )
      )
    );
  }

  const uris = fn.subsequence(cts.uris(null, null, cts.andQuery(queries)), 1, limit);
  return uris;
}

/**
 * Main unit of processing for a execution document.  Performs state actions and transitions to next state.
 *
 * @param {*} uri - the uri of the execution document
 * @returns (boolean) indicates if processing of the execution document should continue
 */
function processExecution(uri) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  xdmp.trace(TRACE_EVENT, `state-conductor execution processing for execution document "${uri}"`);

  // sanity check
  if (!fn.docAvailable(uri)) {
    fn.error(
      null,
      'INVALID-EXECUTION-DOCUMENT',
      `State Conductor execution document "${uri}" not found!`
    );
  }
  const executionDoc = cts.doc(uri);
  const execution = executionDoc.toObject();
  const status = execution.status;

  // check the stateMachine state
  if (STATE_MACHINE_STATUS_WORKING === status) {
    // execute state actions and transition to next state
    executeStateByExecutionDoc(executionDoc);
    // continue processing
    return true;
  } else if (STATE_MACHINE_STATUS_WAITING === status) {
    // execute resume
    resumeWaitingExecutionByExecutionDoc(executionDoc, 'processExecution');
    // continue processing
    return true;
  } else if (STATE_MACHINE_STATUS_NEW === status) {
    // execution document is not being processed, grab the embedded stateMachine, and start the initial state
    // begin the stateMachine processing
    startProcessingStateMachineByExecutionDoc(executionDoc);
    // continue processing
    return true;
  } else {
    // we're done processing the stateMachine
    xdmp.trace(
      TRACE_EVENT,
      `state-conductor stateMachine completed for execution document "${uri}"`
    );
    // end processing
    return false;
  }
}

function startProcessingStateMachineByExecutionDoc(executionDoc, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const executionObj = scaffoldExecutionDoc(executionDoc.toObject());
  const currStateMachineName = executionObj.name;
  const status = executionObj.status;

  // sanity check
  if (STATE_MACHINE_STATUS_NEW !== status) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-STATE_MACHINE-STATUS: Cannot start a stateMachine that is not in the ${STATE_MACHINE_STATUS_NEW} status`
    );
    fn.error(
      null,
      'INVALID-STATE_MACHINE-STATUS',
      'Cannot start a stateMachine not in the NEW status'
    );
  }

  try {
    // grab the stateMachine definition from the correct db
    const currStateMachine = getStateMachineFromDatabase(
      currStateMachineName,
      executionObj.database
    ).toObject();
    currStateMachine.name = executionObj.name;
    let initialState = getInitialState(currStateMachine);

    // update execution state, status, and provenence
    executionObj.status = STATE_MACHINE_STATUS_WORKING;
    executionObj.state = initialState;

    xdmp.trace(
      TRACE_EVENT,
      `adding document to stateMachine: "${currStateMachineName}" in state: "${initialState}"`
    );

    executionObj.provenance.push({
      date: fn.currentDateTime(),
      from: STATE_MACHINE_NEW_STEP,
      to: initialState,
      executionTime: xdmp.elapsedTime(),
    });

    if (save) {
      xdmp.nodeReplace(executionDoc.root, executionObj);
    }
  } catch (err) {
    return handleError(
      err.name,
      `startProcessingStateMachineByExecutionDoc error for stateMachine "${currStateMachineName}"`,
      err,
      executionDoc,
      executionObj,
      save
    );
  }
  return executionObj;
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} uri - the execution document's uri
 */
function resumeWaitingExecution(uri, resumeBy = 'unspecified', save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  // checks if document is there
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-EXECUTION-DOCUMENT', `Document Execution "${uri}" not found."`);
  }

  const executionDoc = cts.doc(uri);
  resumeWaitingExecutionByExecutionDoc(executionDoc, resumeBy, save);
}

function resumeWaitingExecutionByExecutionDoc(executionDoc, resumeBy, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const uri = xdmp.nodeUri(executionDoc);
  const executionObj = scaffoldExecutionDoc(executionDoc.toObject());
  const name = executionObj.name;
  const stateName = executionObj.state;
  const status = executionObj.status;
  let state;
  let stateMachineObj;

  xdmp.trace(TRACE_EVENT, `resumeWaitingExecution uri "${uri}"`);
  xdmp.trace(TRACE_EVENT, `resumeWaitingExecution stateMachine "${name}"`);
  xdmp.trace(TRACE_EVENT, `resumeWaitingExecution stateMachine state "${stateName}"`);

  // sanity check
  if (STATE_MACHINE_STATUS_WAITING !== status) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-STATE_MACHINE-STATUS: Cannot resume a stateMachine that is not in the ${STATE_MACHINE_STATUS_WAITING} status`
    );
    return fn.error(
      null,
      'INVALID-STATE_MACHINE-STATUS',
      'Cannot resume a stateMachine that is not in the ' + STATE_MACHINE_STATUS_WAITING + ' status'
    );
  }

  // wait state check for processExecution event
  if (resumeBy === 'processExecution' && executionObj.currentlyWaiting.hasOwnProperty('event')) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-CurrentlyWaiting: Cannot resume a stateMachine that is an event by processExecution for uri: "${uri}"`
    );

    return fn.error(
      null,
      'INVALID-CurrentlyWaiting',
      `Cannot resume a stateMachine that is an event by processExecution for uri: "${uri}"`
    );
  }

  // check if current time is greater than nextTaskTime
  if (
    executionObj.currentlyWaiting.hasOwnProperty('nextTaskTime') &&
    xs.dateTime(executionObj.currentlyWaiting.nextTaskTime) >
      fn.currentDateTime() + xdmp.elapsedTime()
  ) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-CurrentlyWaiting: Cannot resume a stateMachine where is wait time has not passed for uri: "${uri}"`
    );

    return fn.error(
      null,
      'INVALID-CurrentlyWaiting',
      `Cannot resume a stateMachine where is wait time has not passed for uri: "${uri}"`
    );
  }

  try {
    stateMachineObj = getStateMachineFromDatabase(name, executionObj.database).toObject();

    try {
      state = stateMachineObj.States[stateName];
    } catch (e) {
      return fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in stateMachine "${name}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `resumeWaitingExecutionByExecutionDoc error for stateMachine "${name}"`,
      err,
      executionDoc,
      executionObj,
      save
    );
  }

  try {
    //removes old waiting data
    delete executionObj.currentlyWaiting;

    executionObj.status = STATE_MACHINE_STATUS_WORKING;
    executionObj.provenance.push({
      date: fn.currentDateTime(),
      state: stateName,
      resumeBy: resumeBy,
      executionTime: xdmp.elapsedTime(),
    });

    return transition(executionDoc, executionObj, stateName, state, stateMachineObj, save);
  } catch (err) {
    return handleStateFailure(uri, name, stateMachineObj, stateName, err, save, executionDoc);
  }
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} uri - the execution document's uri
 */
function retryExecutionAtState(
  uri,
  stateName = STATE_MACHINE_NEW_STEP,
  retriedBy = 'unspecified',
  save = true
) {
  // checks if document is there
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-EXECUTION-DOCUMENT', `Document Execution "${uri}" not found."`);
  }

  const executionDoc = cts.doc(uri);
  retryExecutionAtStateByExecutionDoc(executionDoc, stateName, retriedBy, save);
}

function retryExecutionAtStateByExecutionDoc(executionDoc, stateName, retriedBy, save = true) {
  const uri = xdmp.nodeUri(executionDoc);
  const executionObj = scaffoldExecutionDoc(executionDoc.toObject());
  const name = executionObj.name;
  const status = executionObj.status;
  let state;
  let stateMachineObj;

  xdmp.trace(TRACE_EVENT, `retryExecutionAtStateByExecutionDoc uri "${uri}"`);
  xdmp.trace(TRACE_EVENT, `retryExecutionAtStateByExecutionDoc stateMachine "${name}"`);
  xdmp.trace(TRACE_EVENT, `retryExecutionAtStateByExecutionDoc stateMachine state "${stateName}"`);

  // sanity check
  if (STATE_MACHINE_STATUS_FAILED !== status) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-STATE_MACHINE-STATUS: Cannot retry a stateMachine that is not in the ${STATE_MACHINE_STATUS_FAILED} status`
    );
    return fn.error(
      null,
      'INVALID-STATE_MACHINE-STATUS',
      'Cannot try a stateMachine that is not in the ' + STATE_MACHINE_STATUS_FAILED + ' status'
    );
  }

  try {
    stateMachineObj = getStateMachineFromDatabase(name, executionObj.database).toObject();
    state = stateMachineObj.States[stateName];
    if (!state) {
      fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in stateMachine "${name}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `retryExecutionAtStateByExecutionDoc error for stateMachine "${name}"`,
      err,
      executionDoc,
      executionObj,
      save
    );
  }

  try {
    //removes old waiting data
    delete executionObj.currentlyWaiting;

    executionObj.status = STATE_MACHINE_STATUS_WORKING;
    executionObj.provenance.push({
      date: fn.currentDateTime(),
      state: stateName,
      retriedBy: retriedBy,
      executionTime: xdmp.elapsedTime(),
    });

    return transition(executionDoc, executionObj, stateName, state, stateMachineObj, save);
  } catch (err) {
    return handleStateFailure(uri, name, stateMachineObj, stateName, err, save, executionObj);
  }
}

/**
 * transition to the next state.
 *
 * @param {*} executionDoc - the execution document
 * @param {*} executionObj - the execution object
 * @param {*} stateName - the name of the state most like coming from state
 * @param {*} state - the state object
 * @param {*} stateMachineObj - the stateMachine object
 */
function transition(executionDoc, executionObj, stateName, state, stateMachineObj, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  try {
    // determine the next target state and transition
    let targetState = null;

    xdmp.trace(
      TRACE_EVENT,
      `executing transitions for state: ${stateName} with status of ${executionObj.status}`
    );

    if (executionObj.status === STATE_MACHINE_STATUS_WAITING) {
      xdmp.trace(TRACE_EVENT, `transition wait: ${stateName}`);

      let pro = JSON.parse(JSON.stringify(executionObj.currentlyWaiting));
      pro['doneNextTaskTime'] = pro['nextTaskTime'];
      delete pro['nextTaskTime'];

      executionObj.provenance.push({
        date: fn.currentDateTime(),
        state: stateName,
        waiting: pro,
        executionTime: xdmp.elapsedTime(),
      });
    } else if (!inTerminalState(executionObj, stateMachineObj)) {
      xdmp.trace(TRACE_EVENT, `transition from non-terminal state: ${stateName}`);

      //checks if the state has TimeoutSeconds and sets the timeout
      if (state.hasOwnProperty('TimeLimit')) {
        xdmp.trace(
          TRACE_EVENT,
          `TransactionTimeLimit set to: ${state.TimeLimit} for: ${stateName}`
        );
        xdmp.setTransactionTimeLimit(state.TimeLimit);
      }

      if (STATE_TASK === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if (STATE_PASS === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if (STATE_WAIT === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if (STATE_CHOICE === state.Type.toLowerCase()) {
        try {
          if (state.Choices && state.Choices.length > 0) {
            state.Choices.forEach((choice) => {
              if (!targetState) {
                if (choice.Resource) {
                  let resp = fn.head(
                    executeConditionModule(
                      choice.Resource,
                      executionObj.uri,
                      choice.Parameters,
                      executionObj.context,
                      {
                        database: executionObj.database,
                        modules: executionObj.modules,
                      }
                    )
                  );
                  targetState = resp ? choice.Next : null;
                } else {
                  let resp = lib.evaluateChoiceRule(choice, executionObj.context);
                  targetState = resp ? choice.Next : null;
                }
              }
            });
            targetState = targetState || state.Default;
          } else {
            fn.error(
              null,
              'INVALID-STATE-DEFINITION',
              `no "Choices" defined for Choice state "${stateName}" `
            );
          }
        } catch (err) {
          return handleStateFailure(
            xdmp.nodeUri(executionDoc),
            stateMachineObj.name,
            stateMachineObj,
            stateName,
            err,
            save,
            executionObj
          );
        }
      } else {
        fn.error(
          null,
          'INVALID-STATE-DEFINITION',
          `unsupported transition from state type "${stateName.Type}"` + xdmp.quote(state)
        );
      }

      // perform the transition
      if (targetState) {
        executionObj.state = targetState;

        executionObj.provenance.push({
          date: fn.currentDateTime(),
          from: stateName,
          to: targetState,
          executionTime: xdmp.elapsedTime(),
        });
      } else {
        fn.error(
          null,
          'INVALID-STATE-DEFINITION',
          `No suitable transition found in non-terminal state "${stateName}"`
        );
      }
    } else {
      xdmp.trace(TRACE_EVENT, `transition complete: ${stateName}`);

      // determine the final status
      if (STATE_FAIL === state.Type.toLowerCase()) {
        executionObj.status = STATE_MACHINE_STATUS_FAILED;
      } else {
        executionObj.status = STATE_MACHINE_STATUS_COMPLETE;
      }

      // terminal states have no "Next" target state
      executionObj.provenance.push({
        date: fn.currentDateTime(),
        from: stateName,
        to: 'COMPLETED',
        executionTime: xdmp.elapsedTime(),
      });
    }

    //resets the retries since the step has completed succesfully
    executionObj.retries = {};

    // update the state status and provenence in the execution doc
    if (save) {
      xdmp.nodeReplace(executionDoc.root, executionObj);
    }
  } catch (err) {
    return handleError(
      'TRANSITIONERROR',
      `transition error for state "${stateName}"`,
      err,
      executionDoc,
      executionObj,
      save
    );
  }

  return executionObj;
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} executionDoc - the execution document
 */
function executeStateByExecutionDoc(executionDoc, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  const uri = xdmp.nodeUri(executionDoc);
  const executionObj = scaffoldExecutionDoc(executionDoc.toObject());
  const name = executionObj.name;
  const stateName = executionObj.state;

  let state;
  let stateMachineObj;
  xdmp.trace(TRACE_EVENT, `executing stateMachine "${name}"`);
  xdmp.trace(TRACE_EVENT, `stateMachine state "${stateName}"`);

  // sanity check
  if (STATE_MACHINE_STATUS_WORKING !== executionObj.status) {
    xdmp.trace(
      TRACE_EVENT,
      'INVALID-STATE_MACHINE-STATUS: Cannot execute a stateMachine that is not in the WORKING status'
    );
    return fn.error(
      null,
      'INVALID-STATE_MACHINE-STATUS',
      'Cannot execute a stateMachine that is not in the WORKING status'
    );
  }

  try {
    stateMachineObj = getStateMachineFromDatabase(name, executionObj.database).toObject();

    try {
      state = stateMachineObj.States[stateName];
    } catch (e) {
      fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in stateMachine "${name}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `executeStateByExecutionDoc error for stateMachine "${name}"`,
      err,
      executionDoc,
      executionObj,
      save
    );
  }

  if (state) {
    try {
      //removes old waiting data
      delete executionObj.currentlyWaiting;

      // perform the actions for the "Task" state
      if (state.Type && state.Type.toLowerCase() === STATE_TASK) {
        xdmp.trace(TRACE_EVENT, `executing action for state: ${stateName}`);

        if (state.Resource) {
          let context = executionObj.context;

          // filter the context through the InputPath if set
          if (state.InputPath && state.InputPath !== '$') {
            context = lib.materializeReferencePath(state.InputPath, context);
          }

          //checks if the state has TimeoutSeconds and sets the timeout
          if (state.hasOwnProperty('TimeLimit')) {
            xdmp.trace(
              TRACE_EVENT,
              `TransactionTimeLimit set to: ${state.TimeLimit} for: ${stateName}`
            );
            xdmp.setTransactionTimeLimit(state.TimeLimit);
          }

          // execute the resource modules
          let resp = executeActionModule(
            state.Resource,
            executionObj.uri,
            state.Parameters,
            context,
            {
              database: executionObj.database,
              modules: executionObj.modules,
            }
          );

          // add the data from the result to the execution's context
          if (state.OutputPath && state.OutputPath !== '$') {
            // update the execution context with the response optionally modified by the OutputPath config
            executionObj.context = lib.materializeReferencePath(state.OutputPath, resp);
          } else {
            executionObj.context = resp;
          }
        } else {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Resource" defined for Task state "${stateName}"`
          );
        }
      } else if (state.Type && state.Type.toLowerCase() === STATE_PASS) {
        if (state.Result) {
          let result = state.Result;

          // add the data from the result to the execution's context
          if (state.OutputPath && state.OutputPath !== '$') {
            // update the execution context with the result data optionally modified by the OutputPath config
            executionObj.context = lib.materializeReferencePath(state.OutputPath, result);
          } else {
            executionObj.context = result;
          }
        }
      } else if (
        state.Type &&
        state.Type.toLowerCase() === STATE_WAIT &&
        (state.Event || state.EventPath)
      ) {
        //updated the execution Doc to have info about why its waiting

        xdmp.trace(TRACE_EVENT, `waiting for state: ${stateName}`);

        let eventToWaitFor;

        ///checks if there is EventPath use that over using Event
        if (state.hasOwnProperty('EventPath')) {
          eventToWaitFor = lib.materializeReferencePath(state.EventPath, executionObj.context);
        } else {
          eventToWaitFor = state.Event;
        }

        //makes sure there is an event set
        if (eventToWaitFor == null || eventToWaitFor === '') {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Event" defined for Task state "${stateName}"`
          );
        }

        /* eventToWaitFor = state.Event;  */
        executionObj.currentlyWaiting = {
          event: eventToWaitFor,
        };
        executionObj.status = STATE_MACHINE_STATUS_WAITING;
      } else if (state.Type && state.Type.toLowerCase() === STATE_WAIT && state.Seconds) {
        //updated the execution Doc to have info about why its waiting
        xdmp.trace(TRACE_EVENT, `waiting for state: ${stateName}`);
        if (state.Seconds) {
          let waitTime = Number(state.Seconds);
          let WaitTimeToMinutes = Math.floor(waitTime / 60);
          let currentTime = fn.currentDateTime();
          let WaitTimeToSeconds = waitTime - WaitTimeToMinutes * 60;
          let nextTaskTime = currentTime.add(
            xs.dayTimeDuration('PT' + WaitTimeToMinutes + 'M' + WaitTimeToSeconds + 'S')
          );
          xdmp.trace(TRACE_EVENT, `waiting for state nextTaskTime : ${nextTaskTime}`);
          executionObj.currentlyWaiting = {
            seconds: state.Seconds,
            nextTaskTime: nextTaskTime,
          };
          executionObj.status = STATE_MACHINE_STATUS_WAITING;
        } else {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Seconds" defined for Task state "${stateName}"`
          );
        }
      } else if (state.Type && state.Type.toLowerCase() === STATE_WAIT && state.Timestamp) {
        //updated the execution Doc to have info about why its waiting
        xdmp.trace(TRACE_EVENT, `waiting for state Timestamp : ${stateName}`);
        if (state.Timestamp) {
          xdmp.trace(TRACE_EVENT, ` timestamp  value is : ${state.Timestamp}`);
          let timestamp = state.Timestamp;
          if (fn.matches(timestamp, DATE_TIME_REGEX)) {
            xdmp.trace(TRACE_EVENT, ` pass regex check  value is : ${timestamp}`);
            let nextTaskTime = xdmp.parseDateTime(
              '[Y0001]-[M01]-[D01]T[H01]:[m01]:[f1]',
              timestamp
            );
            if (nextTaskTime < fn.currentDateTime()) {
              xdmp.trace(TRACE_EVENT, `Time for Schedule task has passed : ${nextTaskTime}`);
            }
            executionObj.currentlyWaiting = {
              timestamp: timestamp,
              nextTaskTime: nextTaskTime,
            };
          } else {
            fn.error(
              null,
              'INVALID-STATE-DEFINITION',
              ` "Timestamp" not valid time for Task state "${stateName}"`
            );
          }

          executionObj.status = STATE_MACHINE_STATUS_WAITING;
        } else {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Timestamp" defined for Task state "${stateName}"`
          );
        }
      }
    } catch (err) {
      return handleStateFailure(uri, name, stateMachineObj, stateName, err, save, executionObj);
    }
    return transition(executionDoc, executionObj, stateName, state, stateMachineObj, save);
  } else {
    return handleError(
      'INVALID-STATE-DEFINITION',
      Sequence.from([`state "${stateName}" not found in stateMachine`]),
      null,
      executionDoc,
      executionObj,
      save
    );
  }
}

/**
 * Invokes a Task state's action module
 *
 * @param {*} modulePath the uri of the module to execute
 * @param {*} uri the uri of the in-process document
 * @param {*} params the parameters passed to this state
 * @param {*} context the current execution's context
 * @param {*} options { database, modules } the execution context of the module
 * @returns the action module's resposne
 */
function executeActionModule(modulePath, uri, params, context, { database, modules }) {
  const startTime = xdmp.elapsedTime();
  let resp = invokeOrApplyFunction(
    () => {
      declareUpdate();
      const actionModule = require(modulePath);
      if (typeof actionModule.performAction === 'function') {
        return actionModule.performAction(uri, lib.materializeParameters(params, context), context);
      } else {
        fn.error(
          null,
          'INVALID-STATE-DEFINITION',
          `no "performAction" function defined for action module "${modulePath}"`
        );
      }
    },
    {
      database: database ? database : xdmp.database(),
      modules: modules ? modules : xdmp.modulesDatabase(),
    }
  );
  xdmp.trace(
    TRACE_EVENT,
    `Action module "${modulePath}" completed in ${xdmp.elapsedTime().subtract(startTime)}`
  );
  return fn.head(resp);
}

/**
 * Invokes a Choice state's condition module
 *
 * @param {*} modulePath the uri of the module to execute
 * @param {*} uri the uri of the in-process document
 * @param {*} params the parameters passed to this Choice rule
 * @param {*} context the current execution's context
 * @param {*} options { database, modules } the execution context of the module
 * @returns boolean response of the module
 */
function executeConditionModule(modulePath, uri, params, context, { database, modules }) {
  const startTime = xdmp.elapsedTime();
  let resp = invokeOrApplyFunction(
    () => {
      const conditionModule = require(modulePath);
      if (typeof conditionModule.checkCondition === 'function') {
        return conditionModule.checkCondition(
          uri,
          lib.materializeParameters(params, context),
          context
        );
      } else {
        fn.error(
          null,
          'INVALID-STATE-DEFINITION',
          `no "checkCondition" function defined for condition module "${modulePath}"`
        );
      }
    },
    {
      database: database ? database : xdmp.database(),
      modules: modules ? modules : xdmp.modulesDatabase(),
    }
  );
  xdmp.trace(
    TRACE_EVENT,
    `Condition module "${modulePath}" completed in ${xdmp.elapsedTime().subtract(startTime)}`
  );
  return fn.head(resp);
}

/**
 * Processes a caught error for "Task" and "Choice" states
 * Uses "Choices" to transition to a failure state
 *
 * @param {*} uri
 * @param {*} name
 * @param {*} stateMachine
 * @param {*} stateName
 * @param {*} err
 * @param {*} save
 * @param {*} executionDoc
 * @returns
 */
function handleStateFailure(uri, name, stateMachine, stateName, err, save = true, executionDocIn) {
  const currState = stateMachine.States[stateName];
  xdmp.trace(TRACE_EVENT, `handling state failures for state: ${stateName}`);
  xdmp.trace(TRACE_EVENT, Sequence.from([err]));

  if (save && !fn.docAvailable(uri)) {
    return fn.error(
      null,
      'DOCUMENT-NOT-FOUND',
      Sequence.from([`the document URI of "${uri}" was not found.`, err])
    );
  }

  let executionDoc;
  let executionObj;

  if (save) {
    executionDoc = cts.doc(uri);
    executionObj = executionDoc.toObject();
  } else {
    executionObj = executionDocIn;
  }

  if (
    currState &&
    (STATE_TASK === currState.Type.toLowerCase() || STATE_CHOICE === currState.Type.toLowerCase())
  ) {
    //State defined retry
    if (currState.Retry && currState.Retry.length > 0) {
      // find a matching retry state
      let target = currState.Retry.reduce((acc, retry) => {
        if (!acc) {
          let errorEquals = retry.ErrorEquals.join(',');
          if (
            (retry.ErrorEquals.includes(err.name) ||
              retry.ErrorEquals.includes('States.ALL') ||
              retry.ErrorEquals.includes('*')) &&
            (!executionObj.retries.hasOwnProperty(errorEquals) ||
              executionObj.retries[errorEquals] < (retry.MaxAttempts || DEFAULT_MAX_RETRY_ATTEMPTS))
          ) {
            acc = retry;
          }
        }
        return acc;
      }, null);

      if (target) {
        let errorEquals = target.ErrorEquals.join(',');

        let retryNumber = 1 + (executionObj.retries[errorEquals] || 0);

        executionObj.retries[errorEquals] = retryNumber;

        xdmp.trace(TRACE_EVENT, `retrying execution "${uri}"`);

        // changes execution doc to retry state
        executionObj.status = STATE_MACHINE_STATUS_WORKING;
        executionObj.state = stateName;

        executionObj.provenance.push({
          date: fn.currentDateTime(),
          from: stateName,
          to: stateName,
          retryNumber: retryNumber,
          executionTime: xdmp.elapsedTime(),
        });

        // capture error message in context
        executionObj.errors[stateName] = err;

        if (save) {
          xdmp.nodeReplace(executionDoc.root, executionObj);
        }

        return executionObj;
      }
    }

    //State defined Catch
    if (currState.Catch && currState.Catch.length > 0) {
      // find a matching fallback state
      let target = currState.Catch.reduce((acc, fallback) => {
        if (!acc) {
          if (
            fallback.ErrorEquals.includes(err.name) ||
            fallback.ErrorEquals.includes('States.ALL') ||
            fallback.ErrorEquals.includes('*')
          ) {
            acc = fallback.Next;
          }
        }
        return acc;
      }, null);

      if (target) {
        xdmp.trace(TRACE_EVENT, `transitioning to fallback state "${target}"`);
        // move to the target state
        executionObj.status = STATE_MACHINE_STATUS_WORKING;
        executionObj.state = target;
        executionObj.provenance.push({
          date: fn.currentDateTime(),
          from: stateName,
          to: target,
          executionTime: xdmp.elapsedTime(),
        });
        // capture error message in context
        executionObj.errors[stateName] = err;

        if (save) {
          xdmp.nodeReplace(executionDoc.root, executionObj);
        }

        return executionObj;
      }
    }
  }

  return handleError(
    'INVALID-STATE-DEFINITION',
    `no Catch defined for error "${err.name}" in state "${stateName}"`,
    err,
    executionDoc,
    executionObj,
    save
  );
}

/**
 * Determines if the given document is in terminal (final) state for the given stateMachine
 *
 * @param {*} uri
 * @param {*} stateMachine
 * @returns
 */
function inTerminalState(execution, stateMachine) {
  const currStateName = execution.state;
  let currState = stateMachine.States[currStateName];

  if (currState && !SUPPORTED_STATE_TYPES.includes(currState.Type.toLowerCase())) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `unsupported state type: "${currState.Type}"`);
  }
  return (
    !currState ||
    currState.Type.toLowerCase() === STATE_SUCCEED ||
    currState.Type.toLowerCase() === STATE_FAIL ||
    (currState.Type.toLowerCase() === STATE_TASK && currState.End === true)
  );
}

/**
 * Calculates the state of documents being processed by, and completed through this stateMachine
 *
 * @param {*} name
 * @returns
 */
function getStateMachineCounts(name, { startDate, endDate, detailed = false }) {
  const stateMachine = getStateMachine(name).toObject();
  const states = Object.keys(stateMachine.States);
  const statuses = [
    STATE_MACHINE_STATUS_NEW,
    STATE_MACHINE_STATUS_WORKING,
    STATE_MACHINE_STATUS_WAITING,
    STATE_MACHINE_STATUS_COMPLETE,
    STATE_MACHINE_STATUS_FAILED,
  ];

  let baseQuery = [];
  if (startDate) {
    baseQuery.push(cts.jsonPropertyRangeQuery('createdDate', '>=', xs.dateTime(startDate)));
  }
  if (endDate) {
    baseQuery.push(cts.jsonPropertyRangeQuery('createdDate', '<=', xs.dateTime(endDate)));
  }

  const numInStatus = (status) =>
    fn.count(
      cts.uris(
        '',
        null,
        cts.andQuery(
          [].concat(
            baseQuery,
            cts.jsonPropertyValueQuery('name', name),
            cts.jsonPropertyValueQuery('status', status)
          )
        )
      )
    );

  const numInState = (status, state) =>
    fn.count(
      cts.uris(
        '',
        null,
        cts.andQuery(
          [].concat(
            baseQuery,
            cts.jsonPropertyValueQuery('name', name),
            cts.jsonPropertyValueQuery('status', status),
            cts.jsonPropertyValueQuery('state', state)
          )
        )
      )
    );

  const resp = {
    name: name,
    totalPerStatus: {},
    totalPerState: {},
  };

  invokeOrApplyFunction(
    () => {
      statuses.forEach((status) => (resp.totalPerStatus[status] = numInStatus(status)));

      states.forEach((state) => {
        resp.totalPerState[state] = numInState(statuses, state);
      });

      if (detailed) {
        let details = {};
        statuses.forEach((status) => {
          details[status] = {};
          states.forEach((state) => {
            details[status][state] = numInState(status, state);
          });
        });
        resp.detailedTotalPerStatus = details;
      }
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );

  return resp;
}

/**
 * Should be used when take a execution doc from the database
 * insures all the needed properties are there
 * @param {*} executionDoc
 */
function scaffoldExecutionDoc(executionDoc) {
  const needProps = {
    id: null,
    name: null,
    status: null,
    state: null,
    uri: null,
    database: null,
    modules: null,
    createdDate: null,
    context: {},
    provenance: [],
    errors: {},
    retries: {},
  };

  return Object.assign(needProps, executionDoc);
}

/**
 * Convienence function to create a execution record for a document to be
 * processed by a state conductor State Machine.
 *
 * @param {*} name the name of the State Machine
 * @param {*} uri the uri of the document to be processed by the named State Machine
 * @param {*} [context={}]
 * @param {*} [options={}]
 */
function createStateConductorExecution(name, uri, context = {}, options = {}) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  const collections = [EXECUTION_COLLECTION, xdmp.urlEncode(name)].concat(
    options.collections || []
  );
  const directory = options.directory || '/' + EXECUTION_COLLECTION + '/';
  const database = options.database || xdmp.database();
  const modules = options.modules || xdmp.modulesDatabase();

  const id = sem.uuidString();
  const executionUri = directory + id + '.json';

  const execution = scaffoldExecutionDoc({
    id: id,
    name: name,
    status: STATE_MACHINE_STATUS_NEW,
    state: null,
    uri: uri,
    database: database,
    modules: modules,
    createdDate: fn.currentDateTime(),
    context: context,
  });

  // insert the execution document
  xdmp.trace(
    TRACE_EVENT,
    `inserting execution document: ${executionUri} into db ${STATE_CONDUCTOR_EXECUTIONS_DB}`
  );
  invokeOrApplyFunction(
    () => {
      declareUpdate();
      xdmp.documentInsert(executionUri, execution, {
        permissions: [
          xdmp.permission(EXECUTION_DOC_READ_PERMISSION, 'read'),
          xdmp.permission(EXECUTION_DOC_WRITE_PERMISSION, 'update'),
        ],
        collections: collections,
      });
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );

  // add execution metadata to the target document (if one was passed)
  if (uri) {
    addExecutionMetadata(uri, name, id); // prevents updates to the target from retriggering this stateMachine
  }

  return id;
}

/**
 * Convienence function to create execution records for a batch of documents to be
 * processed by a state conductor stateMachine.
 *
 * @param {*} name
 * @param {*} [uris=[]]
 * @param {*} [context={}]
 * @param {*} [options={}]
 * @returns
 */
function batchCreateStateConductorExecution(name, uris = [], context = {}, options = {}) {
  const ids = uris.map((uri) => createStateConductorExecution(name, uri, context, options));
  return ids;
}

/**
 * Given a state machine name, find an process document's belonging to the named state machine's context.
 *
 * @param {*} name - the name of the flow
 * @param {boolean} [includeAlreadyProcessed=false] - should we include documents which have already been processed by this flow
 * @param {number} [limit=1000] - the number of documents to process
 * @returns an object describing the documents found and jobs created
 */
function gatherAndCreateExecutionsForStateMachine(
  name,
  includeAlreadyProcessed = false,
  limit = 1000
) {
  const targets = findStateMachineTargets(name, includeAlreadyProcessed, limit).toArray();
  const executions = targets.reduce((acc, uri) => {
    acc[uri] = createStateConductorExecution(name, uri);
    return acc;
  }, {});
  return {
    name: name,
    total: targets.length,
    executions: executions,
  };
}

/**
 * Convienence function to emitEvents
 *
 * @param {*} event
 * @param {*} batchSize the size of the batch of uris that gets spawn off
 * @returns
 */
function emitEvent(event, batchSize = 100, save = true) {
  let uris = invokeOrApplyFunction(
    () => {
      declareUpdate();

      //handle execution documents
      let waitingURIExecutionsForEvent = cts
        .uris(
          null,
          null,
          cts.andQuery([
            cts.collectionQuery(EXECUTION_COLLECTION),
            cts.jsonPropertyValueQuery('status', STATE_MACHINE_STATUS_WAITING),
            cts.jsonPropertyScopeQuery(
              'currentlyWaiting',
              cts.jsonPropertyValueQuery('event', event)
            ),
          ])
        )
        .toArray();
      /*
      splits the array into groups of the batchSize
      this is to handle the the case where there are many waiting executions
      */
      var arrayOfwaitingURIExecutionsForEvent = [];

      for (var i = 0; i < waitingURIExecutionsForEvent.length; i += batchSize) {
        arrayOfwaitingURIExecutionsForEvent.push(
          waitingURIExecutionsForEvent.slice(i, i + batchSize)
        );
      }

      //loops through all the arrays
      if (save) {
        arrayOfwaitingURIExecutionsForEvent.forEach(function (uriArray) {
          xdmp.spawn('/state-conductor/resumeWaitingExecutions.sjs', {
            uriArray: uriArray,
            resumeBy: 'emit event: ' + event,
            save: save,
          });
        });
      }

      return waitingURIExecutionsForEvent;
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );

  // handle stateMachines
  // grab all state conductor stateMachines with a event context and matching event
  const stateMachines = cts
    .search(
      cts.andQuery([
        cts.collectionQuery(STATE_MACHINE_COLLECTION),
        cts.jsonPropertyScopeQuery('mlDomain', cts.jsonPropertyValueQuery('scope', 'event')),
        cts.jsonPropertyScopeQuery('mlDomain', cts.jsonPropertyValueQuery('value', event)),
      ])
    )
    .toArray();

  // determine which stateMachines should run and create state conductor executions
  let stateMachinesToTrigger = stateMachines.filter((stateMachine) => {
    // find the stateMachines where the event and scope are in the same object
    let eventContext = stateMachine.xpath(
      "mlDomain/context[scope = 'event' and value = '" + event + "' ]"
    );

    return fn.exists(eventContext);
  });

  let stateMachinesToTriggerResp = stateMachinesToTrigger.map((stateMachine) => {
    // create a state conductor execution for the event stateMachines
    let name = getStateMachineNameFromUri(fn.documentUri(stateMachine));
    let resp = createStateConductorExecution(name, null);
    xdmp.trace(TRACE_EVENT, `created state conductor execution for event stateMachine: ${resp}`);
    return { stateMachineName: name, executionId: resp };
  });

  const output = {
    executionDocumentsTriggered: fn.head(uris),
    stateMachinesTriggered: stateMachinesToTriggerResp,
  };

  return output;
}

/**
 * Query for execution document uris, matching the given options
 *
 * @param {*} options
 * @returns
 */
function getExecutionDocuments(options) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const start = options.start || 1;
  const count = options.count || 100;
  const status = Array.isArray(options.status)
    ? options.status
    : [STATE_MACHINE_STATUS_NEW, STATE_MACHINE_STATUS_WORKING];
  const names = Array.isArray(options.names) ? options.names : [];
  const resumeWait = options.resumeWait;
  const forestIds = options.forestIds;
  let uris = [];

  invokeOrApplyFunction(
    () => {
      const queries = [
        cts.collectionQuery('stateConductorExecution'),
        cts.jsonPropertyValueQuery('status', status),
      ];

      if (names.length > 0) {
        queries.push(cts.jsonPropertyValueQuery('name', names));
      }
      if (options.startDate) {
        queries.push(
          cts.jsonPropertyRangeQuery('createdDate', '>=', xs.dateTime(options.startDate))
        );
      }
      if (options.endDate) {
        queries.push(cts.jsonPropertyRangeQuery('createdDate', '<=', xs.dateTime(options.endDate)));
      }

      let ctsQuery = cts.andQuery(queries);

      // add any "waiting" executions that should be resumed - unless explicitly told not to
      if (!fn.exists(resumeWait) || resumeWait) {
        ctsQuery = cts.orQuery([
          ctsQuery,
          cts.andQuery([
            cts.collectionQuery('stateConductorExecution'),
            cts.jsonPropertyScopeQuery(
              'currentlyWaiting',
              cts.jsonPropertyRangeQuery('nextTaskTime', '<=', fn.currentDateTime())
            ),
          ]),
        ]);
      }

      uris = uris.concat(
        fn
          .subsequence(cts.uris('', ['document'], ctsQuery, null, forestIds), start, count)
          .toArray()
      );
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );
  return uris;
}

/**
 * Convienence function to handle error
 * puts the execution document in an error state
 * return the execution object
 * errors out
 *
 * @param {*} name the name of the error
 * @param {*} message the error message
 * @param {*} err the error object if gotten from a catch
 * @param {*} executionObj the execution object
 * @param {*} save while to update the execution document
 **/
function handleError(name, message, err, executionDoc, executionObj, save = true) {
  xdmp.trace(TRACE_EVENT, name + ':' + message);
  const state = executionObj.state || STATE_MACHINE_NEW_STEP;

  // update the execution document
  executionObj.status = STATE_MACHINE_STATUS_FAILED;
  executionObj.errors[state] = err;

  if (save) {
    xdmp.nodeReplace(executionDoc.root, executionObj);
  }

  return executionObj;
}

module.exports = {
  TRACE_EVENT,
  STATE_CONDUCTOR_EXECUTIONS_DB,
  STATE_CONDUCTOR_TRIGGERS_DB,
  STATE_CONDUCTOR_SCHEMAS_DB,
  DEFAULT_MAX_RETRY_ATTEMPTS,
  STATE_MACHINE_COLLECTION,
  STATE_MACHINE_DIRECTORY,
  STATE_MACHINE_ITEM_COLLECTION,
  STATE_MACHINE_STATUS_NEW,
  STATE_MACHINE_STATUS_WORKING,
  STATE_MACHINE_STATUS_WAITING,
  STATE_MACHINE_STATUS_COMPLETE,
  STATE_MACHINE_STATUS_FAILED,
  EXECUTION_COLLECTION,
  EXECUTION_DIRECTORY,
  addExecutionMetadata,
  batchCreateStateConductorExecution,
  checkStateMachineContext,
  createStateConductorExecution,
  createStateMachine,
  emitEvent,
  executeStateByExecutionDoc,
  findStateMachineTargets,
  gatherAndCreateExecutionsForStateMachine,
  getAllStateMachinesContextQuery,
  getApplicableStateMachines,
  getExecutionDocuments,
  getExecutionIds,
  getExecutionsForUri,
  getInitialState,
  getStateMachine,
  getStateMachineContextQuery,
  getStateMachineCounts,
  getStateMachineFromDatabase,
  getStateMachineNameFromUri,
  getStateMachineNames,
  getStateMachines,
  invokeOrApplyFunction,
  processExecution,
  resumeWaitingExecution,
  resumeWaitingExecutionByExecutionDoc,
  retryExecutionAtState,
  retryExecutionAtStateByExecutionDoc,
  startProcessingStateMachineByExecutionDoc,
};
