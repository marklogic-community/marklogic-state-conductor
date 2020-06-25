'use strict';

const lib = require('/state-conductor/state-conductor-lib.sjs');

const configuration = lib.getConfiguration();

// configurable //
const STATE_CONDUCTOR_JOBS_DB = configuration.databases.jobs;
const STATE_CONDUCTOR_TRIGGERS_DB = configuration.databases.triggers;
const STATE_CONDUCTOR_SCHEMAS_DB = configuration.databases.schemas;
const FLOW_ITEM_COLLECTION = configuration.collections.item;
const JOB_COLLECTION = configuration.collections.job;
const FLOW_COLLECTION = configuration.collections.flow;
const FLOW_DIRECTORY = configuration.URIPrefixes.flow;
const JOB_DIRECTORY = configuration.URIPrefixes.job;

// non-configurable //
const JOB_DOC_READ_PERMISSION = 'state-conductor-reader-role';
const JOB_DOC_WRITE_PERMISSION = 'state-conductor-job-writer-role';
const TRACE_EVENT = 'state-conductor';
const FLOW_FILE_EXTENSION = '.asl.json';
const FLOW_JOBID_PROP_NAME = 'state-conductor-job';
const FLOW_STATUS_NEW = 'new';
const FLOW_STATUS_WORKING = 'working';
const FLOW_STATUS_WAITING = 'waiting';
const FLOW_STATUS_COMPLETE = 'complete';
const FLOW_STATUS_FAILED = 'failed';
const FLOW_NEW_STEP = 'NEW';
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
 * invoking for the jobs/content database.
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
 * Gets a flow definition by flowName
 *
 * @param {*} name
 * @returns the flow document or null if not found
 */
function getFlowDocument(name) {
  let nameWithExtension = fn.normalizeSpace(name) + FLOW_FILE_EXTENSION;
  const uri = fn.head(
    cts.uriMatch(
      '*' + nameWithExtension,
      ['document', 'case-sensitive'],
      cts.collectionQuery(FLOW_COLLECTION)
    )
  );

  return uri ? cts.doc(uri) : null;
}

/**
 * Gets a flow definition by flowName from the given database.
 * Throws an error if not found
 *
 * @param {*} name
 * @param {*} databaseId
 * @returns
 */
function getFlowDocumentFromDatabase(name, databaseId) {
  let resp = invokeOrApplyFunction(
    () => {
      let flow = getFlowDocument(name);
      if (!flow) {
        fn.error(null, 'MISSING-FLOW-FILE', `Cannot find a a flow file with the name: ${name}`);
      }
      return flow;
    },
    {
      database: databaseId,
    }
  );
  return fn.head(resp);
}

/**
 * Gets all flow definition documents
 *
 * @returns
 */
function getFlowDocuments() {
  return fn.collection(FLOW_COLLECTION);
}

/**
 * Gets all flow definition names
 *
 * @returns
 */
function getFlowNames() {
  return cts
    .uris('/', ['document'], cts.collectionQuery(FLOW_COLLECTION))
    .toArray()
    .map((uri) => getFlowNameFromUri(uri));
}

/**
 * Given a flow definition URI, determine it's flow name
 *
 * @param {*} uri
 * @returns
 */
function getFlowNameFromUri(uri) {
  uri = uri.toString();
  uri = uri.slice(uri.lastIndexOf('/') + 1);
  return uri.lastIndexOf(FLOW_FILE_EXTENSION) !== -1
    ? uri.slice(0, uri.lastIndexOf(FLOW_FILE_EXTENSION))
    : uri;
}

/**
 * Returns the initial state for the given state machine definition
 *
 * @param {*} { flowName, StartAt }
 * @returns
 */
function getInitialState({ flowName, StartAt }) {
  if (!StartAt || StartAt.length === 0) {
    fn.error(
      null,
      'INVALID-STATE-DEFINITION',
      `no "StartAt" defined for state machine "${flowName}"`
    );
  }
  return StartAt;
}

/**
 * Gets the value of the property which links a document to a State Conductor job
 *
 * @param {*} uri
 * @param {*} flowName
 * @returns
 */
function getJobMetadatProperty(uri, flowName) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  if (fn.docAvailable(uri)) {
    return xdmp
      .documentGetProperties(uri, fn.QName('', FLOW_JOBID_PROP_NAME))
      .toArray()
      .filter((prop) => prop.getAttributeNode('flow-name').nodeValue === flowName);
  }
}

/**
 * Links the given document to a state conductor job
 *
 * @param {*} uri
 * @param {*} flowName
 * @param {*} jobId
 */
function addJobMetadata(uri, flowName, jobId) {
  const builder = new NodeBuilder();
  builder.startElement(FLOW_JOBID_PROP_NAME);
  builder.addAttribute('flow-name', flowName);
  builder.addAttribute('job-id', jobId);
  builder.addAttribute('date', new Date().toISOString());
  builder.endElement();
  let jobMetaElem = builder.toNode();
  xdmp.documentAddProperties(uri, [jobMetaElem]);
}

function getJobIds(uri, flowName) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const jobProps = getJobMetadatProperty(uri, flowName);
  return jobProps.map((prop) => prop.getAttributeNode('job-id').nodeValue);
}

/**
 * Determines if the given document matches the given flow's context
 *
 * @param {*} uri
 * @param {*} flow
 * @returns
 */
function checkFlowContext(uri, flow) {
  if (fn.docAvailable(uri)) {
    const query = getFlowContextQuery(flow);
    const uris = cts.uris('', 'limit=1', cts.andQuery([cts.documentQuery(uri), query]));
    return uri === fn.string(fn.head(uris));
  }

  return false;
}

/**
 * Given a document's uri, finds all the flows whose context applies,
 * and which have not previously processed this document.
 *
 * @param {*} uri
 * @returns
 */
function getApplicableFlows(uri) {
  const flows = getFlowDocuments()
    .toArray()
    .filter((flow) => {
      let flowName = getFlowNameFromUri(fn.documentUri(flow));
      let flowOjb = flow.toObject();
      return getJobIds(uri, flowName).length === 0 && checkFlowContext(uri, flowOjb);
    });

  return flows;
}

/**
 * Given a flow, generate a cts query for it's context
 *
 * @param {*} flow
 * @returns
 */
function getFlowContextQuery(flow) {
  const domain = flow.mlDomain;
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
 * Generate a cts query matching the context of all flows
 *
 * @returns
 */
function getAllFlowsContextQuery() {
  let queries = getFlowDocuments()
    .toArray()
    .map((flow) => getFlowContextQuery(flow.toObject()));

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
 * Main unit of processing for a job document.  Performs state actions and transitions to next state.
 *
 * @param {*} uri - the uri of the job document
 * @returns (boolean) indicates if processing of the job document should continue
 */
function processJob(uri) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  xdmp.trace(TRACE_EVENT, `state-conductor job processing for job document "${uri}"`);
  // sanity check
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-JOB-DOCUMENT', `State Conductor job document "${uri}" not found!`);
  }
  const jobDoc = cts.doc(uri);
  const job = jobDoc.toObject();
  const status = job.flowStatus;

  // check the flow state
  if (FLOW_STATUS_WORKING === status) {
    // execute state actions and transition to next state
    executeStateByJobDoc(jobDoc);
    // continue processing
    return true;
  } else if (FLOW_STATUS_WAITING === status) {
    // execute resume
    resumeWaitingJobByJobDoc(jobDoc, 'processJob');
    // continue processing
    return true;
  } else if (FLOW_STATUS_NEW === status) {
    // job document is not being processed, grab the embedded flow, and start the initial state
    // begin the flow processing
    startProcessingFlowByJobDoc(jobDoc);
    // continue processing
    return true;
  } else {
    // we're done processing the flow
    xdmp.trace(TRACE_EVENT, `state-conductor flow completed for job document "${uri}"`);
    // end processing
    return false;
  }
}

function startProcessingFlowByJobDoc(jobDoc, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const currFlowName = jobObj.flowName;
  const status = jobObj.flowStatus;

  // sanity check
  if (FLOW_STATUS_NEW !== status) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-FLOW-STATUS: Cannot start a flow that is not in the ${FLOW_STATUS_NEW} status`
    );
    fn.error(null, 'INVALID-FLOW-STATUS', 'Cannot start a flow not in the NEW status');
  }

  try {
    // grab the flow definition from the correct db
    const currFlow = getFlowDocumentFromDatabase(currFlowName, jobObj.database).toObject();
    currFlow.flowName = jobObj.flowName;
    let initialState = getInitialState(currFlow);

    // update job state, status, and provenence
    jobObj.flowStatus = FLOW_STATUS_WORKING;
    jobObj.flowState = initialState;

    xdmp.trace(
      TRACE_EVENT,
      `adding document to flow: "${currFlowName}" in state: "${initialState}"`
    );

    jobObj.provenance.push({
      date: new Date().toISOString(),
      from: FLOW_NEW_STEP,
      to: initialState,
    });

    if (save) {
      xdmp.nodeReplace(jobDoc.root, jobObj);
    }
  } catch (err) {
    return handleError(
      err.name,
      `startProcessingFlowByJobDoc error for flow "${currFlowName}"`,
      err,
      jobDoc,
      jobObj,
      save
    );
  }
  return jobObj;
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} uri - the job document's uri
 */
function resumeWaitingJob(uri, resumeBy = 'unspecified', save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  // checks if document is there
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-JOB-DOCUMENT', `Document Job "${uri}" not found."`);
  }

  const jobDoc = cts.doc(uri);
  resumeWaitingJobByJobDoc(jobDoc, resumeBy, save);
}

function resumeWaitingJobByJobDoc(jobDoc, resumeBy, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const uri = xdmp.nodeUri(jobDoc);
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const flowName = jobObj.flowName;
  const stateName = jobObj.flowState;
  const flowStatus = jobObj.flowStatus;
  let state;
  let flowObj;

  xdmp.trace(TRACE_EVENT, `resumeWaitingJob uri "${uri}"`);
  xdmp.trace(TRACE_EVENT, `resumeWaitingJob flow "${flowName}"`);
  xdmp.trace(TRACE_EVENT, `resumeWaitingJob flow state "${stateName}"`);

  // sanity check
  if (FLOW_STATUS_WAITING !== flowStatus) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-FLOW-STATUS: Cannot resume a flow that is not in the ${FLOW_STATUS_WAITING} status`
    );
    return fn.error(
      null,
      'INVALID-FLOW-STATUS',
      'Cannot resume a flow that is not in the ' + FLOW_STATUS_WAITING + ' status'
    );
  }

  try {
    flowObj = getFlowDocumentFromDatabase(flowName, jobObj.database).toObject();

    try {
      state = flowObj.States[stateName];
    } catch (e) {
      return fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in flow "${flowName}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `resumeWaitingJobByJobDoc error for flow "${flowName}"`,
      err,
      jobDoc,
      jobObj,
      save
    );
  }

  try {
    //removes old waiting data
    delete jobObj.currentlyWaiting;

    jobObj.flowStatus = FLOW_STATUS_WORKING;
    jobObj.provenance.push({
      date: new Date().toISOString(),
      state: stateName,
      resumeBy: resumeBy,
    });

    return transition(jobDoc, jobObj, stateName, state, flowObj, save);
  } catch (err) {
    return handleStateFailure(uri, flowName, flowObj, stateName, err, save, jobDoc);
  }
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} uri - the job document's uri
 */
function retryJobAtState(uri, stateName = FLOW_NEW_STEP, retriedBy = 'unspecified', save = true) {
  // checks if document is there
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-JOB-DOCUMENT', `Document Job "${uri}" not found."`);
  }

  const jobDoc = cts.doc(uri);
  retryJobAtStateByJobDoc(jobDoc, stateName, retriedBy, save);
}

function retryJobAtStateByJobDoc(jobDoc, stateName, retriedBy, save = true) {
  const uri = xdmp.nodeUri(jobDoc);
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const flowName = jobObj.flowName;
  const flowStatus = jobObj.flowStatus;
  let state;
  let flowObj;

  xdmp.trace(TRACE_EVENT, `retryJobAtStateByJobDoc uri "${uri}"`);
  xdmp.trace(TRACE_EVENT, `retryJobAtStateByJobDoc flow "${flowName}"`);
  xdmp.trace(TRACE_EVENT, `retryJobAtStateByJobDoc flow state "${stateName}"`);

  // sanity check
  if (FLOW_STATUS_FAILED !== flowStatus) {
    xdmp.trace(
      TRACE_EVENT,
      `INVALID-FLOW-STATUS: Cannot retry a flow that is not in the ${FLOW_STATUS_FAILED} status`
    );
    return fn.error(
      null,
      'INVALID-FLOW-STATUS',
      'Cannot try a flow that is not in the ' + FLOW_STATUS_FAILED + ' status'
    );
  }

  try {
    flowObj = getFlowDocumentFromDatabase(flowName, jobObj.database).toObject();
    state = flowObj.States[stateName];
    if (!state) {
      fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in flow "${flowName}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `retryJobAtStateByJobDoc error for flow "${flowName}"`,
      err,
      jobDoc,
      jobObj,
      save
    );
  }

  try {
    //removes old waiting data
    delete jobObj.currentlyWaiting;

    jobObj.flowStatus = FLOW_STATUS_WORKING;
    jobObj.provenance.push({
      date: new Date().toISOString(),
      state: stateName,
      retriedBy: retriedBy,
    });

    return transition(jobDoc, jobObj, stateName, state, flowObj, save);
  } catch (err) {
    return handleStateFailure(uri, flowName, flowObj, stateName, err, save, jobObj);
  }
}

/**
 * transition to the next state.
 *
 * @param {*} jobDoc - the job document
 * @param {*} jobObj - the job object
 * @param {*} stateName - the name of the state most like coming from flowState
 * @param {*} state - the state object
 * @param {*} flowObj - the flow object
 */
function transition(jobDoc, jobObj, stateName, state, flowObj, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  try {
    // determine the next target state and transition
    let targetState = null;

    xdmp.trace(
      TRACE_EVENT,
      `executing transitions for state: ${stateName} with status of ${jobObj.flowStatus}`
    );

    if (jobObj.flowStatus === FLOW_STATUS_WAITING) {
      xdmp.trace(TRACE_EVENT, `transition wait: ${stateName}`);

      let pro = JSON.parse(JSON.stringify(jobObj.currentlyWaiting));
      pro['doneNextTaskTime'] = pro['nextTaskTime'];
      delete pro['nextTaskTime'];

      jobObj.provenance.push({
        date: new Date().toISOString(),
        state: stateName,
        waiting: pro,
      });
    } else if (!inTerminalState(jobObj, flowObj)) {
      xdmp.trace(TRACE_EVENT, `transition from non-terminal state: ${stateName}`);

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
                      jobObj.uri,
                      choice.Parameters,
                      jobObj.context,
                      {
                        database: jobObj.database,
                        modules: jobObj.modules,
                      }
                    )
                  );
                  targetState = resp ? choice.Next : null;
                } else {
                  let resp = lib.evaluateChoiceRule(choice, jobObj.context);
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
            xdmp.nodeUri(jobDoc),
            flowObj.flowName,
            flowObj,
            stateName,
            err,
            save,
            jobObj
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
        jobObj.flowState = targetState;

        jobObj.provenance.push({
          date: new Date().toISOString(),
          from: stateName,
          to: targetState,
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
        jobObj.flowStatus = FLOW_STATUS_FAILED;
      } else {
        jobObj.flowStatus = FLOW_STATUS_COMPLETE;
      }

      // terminal states have no "Next" target state
      jobObj.provenance.push({
        date: new Date().toISOString(),
        from: stateName,
        to: 'COMPLETED',
      });
    }

    //resets the retries since the step has completed succesfully
    jobObj.retries = {};

    // update the state status and provenence in the job doc
    if (save) {
      xdmp.nodeReplace(jobDoc.root, jobObj);
    }
  } catch (err) {
    return handleError(
      'TRANSITIONERROR',
      `transition error for state "${stateName}"`,
      err,
      jobDoc,
      jobObj,
      save
    );
  }

  return jobObj;
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} jobDoc - the job document
 */
function executeStateByJobDoc(jobDoc, save = true) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  const uri = xdmp.nodeUri(jobDoc);
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const flowName = jobObj.flowName;
  const stateName = jobObj.flowState;
  let state;
  let flowObj;
  xdmp.trace(TRACE_EVENT, `executing flow "${flowName}"`);
  xdmp.trace(TRACE_EVENT, `flow state "${stateName}"`);

  // sanity check
  if (FLOW_STATUS_WORKING !== jobObj.flowStatus) {
    xdmp.trace(
      TRACE_EVENT,
      'INVALID-FLOW-STATUS: Cannot execute a flow that is not in the WORKING status'
    );
    return fn.error(
      null,
      'INVALID-FLOW-STATUS',
      'Cannot execute a flow that is not in the WORKING status'
    );
  }

  try {
    flowObj = getFlowDocumentFromDatabase(flowName, jobObj.database).toObject();

    try {
      state = flowObj.States[stateName];
    } catch (e) {
      fn.error(
        null,
        'INVALID-STATE-DEFINITION',
        `Can't Find the state "${stateName}" in flow "${flowName}"`
      );
    }
  } catch (err) {
    return handleError(
      err.name,
      `executeStateByJobDoc error for flow "${flowName}"`,
      err,
      jobDoc,
      jobObj,
      save
    );
  }

  if (state) {
    try {
      //removes old waiting data
      delete jobObj.currentlyWaiting;

      // perform the actions for the "Task" state
      if (state.Type && state.Type.toLowerCase() === STATE_TASK) {
        xdmp.trace(TRACE_EVENT, `executing action for state: ${stateName}`);

        if (state.Resource) {
          let context = jobObj.context;

          // filter the context through the InputPath if set
          if (state.InputPath && state.InputPath !== '$') {
            context = lib.materializeReferencePath(state.InputPath, context);
          }

          // execute the resource modules
          let resp = executeActionModule(state.Resource, jobObj.uri, state.Parameters, context, {
            database: jobObj.database,
            modules: jobObj.modules,
          });

          // add the data from the result to the job's context
          if (state.OutputPath && state.OutputPath !== '$') {
            // update the job context with the response optionally modified by the OutputPath config
            jobObj.context = lib.materializeReferencePath(state.OutputPath, resp);
          } else {
            jobObj.context = resp;
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

          // add the data from the result to the job's context
          if (state.OutputPath && state.OutputPath !== '$') {
            // update the job context with the result data optionally modified by the OutputPath config
            jobObj.context = lib.materializeReferencePath(state.OutputPath, result);
          } else {
            jobObj.context = result;
          }
        }
      } else if (
        state.Type &&
        state.Type.toLowerCase() === STATE_WAIT &&
        (state.Event || state.EventPath)
      ) {
        //updated the job Doc to have info about why its waiting

        xdmp.trace(TRACE_EVENT, `waiting for state: ${stateName}`);

        let eventToWaitFor;

        ///checks if there is EventPath use that over using Event
        if (state.hasOwnProperty('EventPath')) {
          eventToWaitFor = lib.materializeReferencePath(state.EventPath, jobObj.context);
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
        jobObj.currentlyWaiting = {
          event: eventToWaitFor,
        };
        jobObj.flowStatus = FLOW_STATUS_WAITING;
      } else if (state.Type && state.Type.toLowerCase() === STATE_WAIT && state.Seconds) {
        //updated the job Doc to have info about why its waiting
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
          jobObj.currentlyWaiting = {
            seconds: state.Seconds,
            nextTaskTime: nextTaskTime,
          };
          jobObj.flowStatus = FLOW_STATUS_WAITING;
        } else {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Seconds" defined for Task state "${stateName}"`
          );
        }
      } else if (state.Type && state.Type.toLowerCase() === STATE_WAIT && state.Timestamp) {
        //updated the job Doc to have info about why its waiting
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
            jobObj.currentlyWaiting = {
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

          jobObj.flowStatus = FLOW_STATUS_WAITING;
        } else {
          fn.error(
            null,
            'INVALID-STATE-DEFINITION',
            `no "Timestamp" defined for Task state "${stateName}"`
          );
        }
      }
    } catch (err) {
      return handleStateFailure(uri, flowName, flowObj, stateName, err, save, jobObj);
    }
    return transition(jobDoc, jobObj, stateName, state, flowObj, save);
  } else {
    return handleError(
      'INVALID-STATE-DEFINITION',
      Sequence.from([`state "${stateName}" not found in flow`]),
      null,
      jobDoc,
      jobObj,
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
 * @param {*} context the current job's context
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
 * @param {*} context the current job's context
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
 * @param {*} flowName
 * @param {*} flow
 * @param {*} stateName
 * @param {*} err
 * @param {*} save
 * @param {*} jobDoc
 * @returns
 */
function handleStateFailure(uri, flowName, flow, stateName, err, save = true, jobDocIn) {
  const currState = flow.States[stateName];
  xdmp.trace(TRACE_EVENT, `handling state failures for state: ${stateName}`);
  xdmp.trace(TRACE_EVENT, Sequence.from([err]));

  if (save && !fn.docAvailable(uri)) {
    return fn.error(
      null,
      'DOCUMENT-NOT-FOUND',
      Sequence.from([`the document URI of "${uri}" was not found.`, err])
    );
  }

  let jobDoc;
  let jobObj;

  if (save) {
    jobDoc = cts.doc(uri);
    jobObj = jobDoc.toObject();
  } else {
    jobObj = jobDocIn;
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
            (!jobObj.retries.hasOwnProperty(errorEquals) ||
              jobObj.retries[errorEquals] < (retry.MaxAttempts || DEFAULT_MAX_RETRY_ATTEMPTS))
          ) {
            acc = retry;
          }
        }
        return acc;
      }, null);

      if (target) {
        let errorEquals = target.ErrorEquals.join(',');

        let retryNumber = 1 + (jobObj.retries[errorEquals] || 0);

        jobObj.retries[errorEquals] = retryNumber;

        xdmp.trace(TRACE_EVENT, `retrying job "${uri}"`);

        // changes job doc to retry state
        jobObj.flowStatus = FLOW_STATUS_WORKING;
        jobObj.flowState = stateName;

        jobObj.provenance.push({
          date: new Date().toISOString(),
          from: stateName,
          to: stateName,
          retryNumber: retryNumber,
        });

        // capture error message in context
        jobObj.errors[stateName] = err;

        if (save) {
          xdmp.nodeReplace(jobDoc.root, jobObj);
        }

        return jobObj;
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
        jobObj.flowStatus = FLOW_STATUS_WORKING;
        jobObj.flowState = target;
        jobObj.provenance.push({
          date: new Date().toISOString(),
          from: stateName,
          to: target,
        });
        // capture error message in context
        jobObj.errors[stateName] = err;

        if (save) {
          xdmp.nodeReplace(jobDoc.root, jobObj);
        }

        return jobObj;
      }
    }
  }

  return handleError(
    'INVALID-STATE-DEFINITION',
    `no Catch defined for error "${err.name}" in state "${stateName}"`,
    err,
    jobDoc,
    jobObj,
    save
  );
}

/**
 * Determines if the given document is in terminal (final) state for the given flow
 *
 * @param {*} uri
 * @param {*} flow
 * @returns
 */
function inTerminalState(job, flow) {
  const currStateName = job.flowState;
  let currState = flow.States[currStateName];

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
 * Calculates the state of documents being processed by, and completed through this flow
 *
 * @param {*} flowName
 * @returns
 */
function getFlowCounts(flowName, { startDate, endDate, detailed = false }) {
  const flow = getFlowDocument(flowName).toObject();
  const states = Object.keys(flow.States);
  const statuses = [
    FLOW_STATUS_NEW,
    FLOW_STATUS_WORKING,
    FLOW_STATUS_WAITING,
    FLOW_STATUS_COMPLETE,
    FLOW_STATUS_FAILED,
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
            cts.jsonPropertyValueQuery('flowName', flowName),
            cts.jsonPropertyValueQuery('flowStatus', status)
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
            cts.jsonPropertyValueQuery('flowName', flowName),
            cts.jsonPropertyValueQuery('flowStatus', status),
            cts.jsonPropertyValueQuery('flowState', state)
          )
        )
      )
    );

  const resp = {
    flowName: flowName,
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
      database: xdmp.database(STATE_CONDUCTOR_JOBS_DB),
    }
  );

  return resp;
}

/**
 * Should be used when take a job doc from the database
 * insures all the needed properties are there
 * @param {*} jobDoc
 */
function scaffoldJobDoc(jobDoc) {
  const needProps = {
    id: null,
    flowName: null,
    flowStatus: null,
    flowState: null,
    uri: null,
    database: null,
    modules: null,
    createdDate: null,
    context: {},
    provenance: [],
    errors: {},
    retries: {},
  };

  return Object.assign(needProps, jobDoc);
}

/**
 * Convienence function to create a job record for a document to be
 * processed by a state conductor flow.
 *
 * @param {*} flowName
 * @param {*} uri
 * @param {*} [context={}]
 * @param {*} [options={}]
 */
function createStateConductorJob(flowName, uri, context = {}, options = {}) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');

  const collections = [JOB_COLLECTION].concat(options.collections || []);
  const directory = options.directory || '/' + JOB_COLLECTION + '/';
  const database = options.database || xdmp.database();
  const modules = options.modules || xdmp.modulesDatabase();

  const id = sem.uuidString();
  const jobUri = directory + id + '.json';

  // TODO any benifit to defining a class for the job document?
  const job = scaffoldJobDoc({
    id: id,
    flowName: flowName,
    flowStatus: FLOW_STATUS_NEW,
    flowState: null,
    uri: uri,
    database: database,
    modules: modules,
    createdDate: new Date().toISOString(),
    context: context,
    provenance: [],
  });

  // insert the job document
  xdmp.trace(TRACE_EVENT, `inserting job document: ${jobUri} into db ${STATE_CONDUCTOR_JOBS_DB}`);
  invokeOrApplyFunction(
    () => {
      declareUpdate();
      xdmp.documentInsert(jobUri, job, {
        permissions: [
          xdmp.permission(JOB_DOC_READ_PERMISSION, 'read'),
          xdmp.permission(JOB_DOC_WRITE_PERMISSION, 'update'),
        ],
        collections: collections,
      });
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_JOBS_DB),
    }
  );

  // add job metadata to the target document (if one was passed)
  if (uri) {
    addJobMetadata(uri, flowName, id); // prevents updates to the target from retriggering this flow
  }

  return id;
}

/**
 * Convienence function to create job records for a batch of documents to be
 * processed by a state conductor flow.
 *
 * @param {*} flowName
 * @param {*} [uris=[]]
 * @param {*} [context={}]
 * @param {*} [options={}]
 * @returns
 */
function batchCreateStateConductorJob(flowName, uris = [], context = {}, options = {}) {
  const ids = uris.map((uri) => createStateConductorJob(flowName, uri, context, options));
  return ids;
}

/**
 * Convienence function to emmitEvents
 *
 * @param {*} event
 * @param {*} batchSize the size of the batch of uris that gets spawn off
 * @returns
 */
function emmitEvent(event, batchSize = 100, save = true) {
  let uris = invokeOrApplyFunction(
    () => {
      declareUpdate();

      //handle job documents
      let waitingURIJobsForEvent = cts
        .uris(
          null,
          null,
          cts.andQuery([
            cts.collectionQuery(JOB_COLLECTION),
            cts.jsonPropertyValueQuery('flowStatus', FLOW_STATUS_WAITING),
            cts.jsonPropertyScopeQuery(
              'currentlyWaiting',
              cts.jsonPropertyValueQuery('event', event)
            ),
          ])
        )
        .toArray();
      /*
      splits the array into groups of the batchSize
      this is to handle the the case where there are many waiting jobs
      */
      var arrayOfwaitingURIJobsForEvent = [];

      for (var i = 0; i < waitingURIJobsForEvent.length; i += batchSize) {
        arrayOfwaitingURIJobsForEvent.push(waitingURIJobsForEvent.slice(i, i + batchSize));
      }

      //loops through all the arrays
      if (save) {
        arrayOfwaitingURIJobsForEvent.forEach(function (uriArray) {
          xdmp.spawn('/state-conductor/resumeWaitingJobs.sjs', {
            uriArray: uriArray,
            resumeBy: 'emmit event: ' + event,
            save: save,
          });
        });
      }

      return waitingURIJobsForEvent;
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_JOBS_DB),
    }
  );

  // handle flows
  // grab all state conductor flows with a event context and matching event
  const flows = cts
    .search(
      cts.andQuery([
        cts.collectionQuery(FLOW_COLLECTION),
        cts.jsonPropertyScopeQuery('mlDomain', cts.jsonPropertyValueQuery('scope', 'event')),
        cts.jsonPropertyScopeQuery('mlDomain', cts.jsonPropertyValueQuery('value', event)),
      ])
    )
    .toArray();

  // determine which flows should run and create state conductor jobs
  let flowsToTrigger = flows.filter((flow) => {
    // find the flows where the event and scope are in the same object
    let eventContext = flow.xpath("mlDomain/context[scope = 'event' and value = '" + event + "' ]");

    return fn.exists(eventContext);
  });

  let flowsToTriggerResp = flowsToTrigger.map((flow) => {
    // create a state conductor job for the event flows
    let flowName = getFlowNameFromUri(fn.documentUri(flow));
    let resp = createStateConductorJob(flowName, null);
    xdmp.trace(TRACE_EVENT, `created state conductor job for event flow: ${resp}`);
    return { flowName: flowName, JobId: resp };
  });

  const output = {
    jobDocumentsTriggered: fn.head(uris),
    flowsTriggered: flowsToTriggerResp,
  };

  return output;
}

/**
 * Query for job document uris, matching the given options
 *
 * @param {*} options
 * @returns
 */
function getJobDocuments(options) {
  xdmp.securityAssert('http://marklogic.com/state-conductor/privilege/execute', 'execute');
  const count = options.count || 100;
  const flowStatus = Array.isArray(options.flowStatus)
    ? options.flowStatus
    : [FLOW_STATUS_NEW, FLOW_STATUS_WORKING];
  const flowNames = Array.isArray(options.flowNames) ? options.flowNames : [];
  const resumeWait = options.resumeWait;
  const forestIds = options.forestIds;
  let uris = [];

  invokeOrApplyFunction(
    () => {
      const queries = [
        cts.collectionQuery('stateConductorJob'),
        cts.jsonPropertyValueQuery('flowStatus', flowStatus),
      ];

      if (flowNames.length > 0) {
        queries.push(cts.jsonPropertyValueQuery('flowName', flowNames));
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

      // add any "waiting" jobs that should be resumed - unless explicitly told not to
      if (!fn.exists(resumeWait) || resumeWait) {
        ctsQuery = cts.orQuery([
          ctsQuery,
          cts.andQuery([
            cts.collectionQuery('stateConductorJob'),
            cts.jsonPropertyScopeQuery(
              'currentlyWaiting',
              cts.jsonPropertyRangeQuery('nextTaskTime', '<=', fn.currentDateTime())
            ),
          ]),
        ]);
      }

      uris = uris.concat(
        cts.uris('', ['document', `limit=${count}`], ctsQuery, null, forestIds).toArray()
      );
    },
    {
      database: xdmp.database(STATE_CONDUCTOR_JOBS_DB),
    }
  );
  return uris;
}

/**
 * Convienence function to handle error
 * puts the job document in an error state
 * return the job object
 * errors out
 *
 * @param {*} name the name of the error
 * @param {*} message the error message
 * @param {*} err the error object if gotten from a catch
 * @param {*} jobObj the job object
 * @param {*} save while to update the job document
 **/
function handleError(name, message, err, jobDoc, jobObj, save = true) {
  xdmp.trace(TRACE_EVENT, name + ':' + message);
  const state = jobObj.flowState || FLOW_NEW_STEP;

  // update the job document
  jobObj.flowStatus = FLOW_STATUS_FAILED;
  jobObj.errors[state] = err;

  if (save) {
    xdmp.nodeReplace(jobDoc.root, jobObj);
  }

  // trigger CPF error state (intentionally commented out)
  //fn.error(null, name, Sequence.from([message, err]));

  return jobObj;
}

module.exports = {
  TRACE_EVENT,
  STATE_CONDUCTOR_JOBS_DB,
  STATE_CONDUCTOR_TRIGGERS_DB,
  STATE_CONDUCTOR_SCHEMAS_DB,
  DEFAULT_MAX_RETRY_ATTEMPTS,
  FLOW_COLLECTION,
  FLOW_DIRECTORY,
  FLOW_ITEM_COLLECTION,
  FLOW_STATUS_NEW,
  FLOW_STATUS_WORKING,
  FLOW_STATUS_WAITING,
  FLOW_STATUS_COMPLETE,
  FLOW_STATUS_FAILED,
  JOB_COLLECTION,
  JOB_DIRECTORY,
  addJobMetadata,
  batchCreateStateConductorJob,
  checkFlowContext,
  createStateConductorJob,
  emmitEvent,
  executeStateByJobDoc,
  getAllFlowsContextQuery,
  getApplicableFlows,
  getFlowContextQuery,
  getFlowCounts,
  getFlowDocument,
  getFlowDocumentFromDatabase,
  getFlowDocuments,
  getFlowNameFromUri,
  getFlowNames,
  getInitialState,
  getJobDocuments,
  getJobIds,
  invokeOrApplyFunction,
  processJob,
  resumeWaitingJob,
  resumeWaitingJobByJobDoc,
  retryJobAtState,
  retryJobAtStateByJobDoc,
  startProcessingFlowByJobDoc,
};
