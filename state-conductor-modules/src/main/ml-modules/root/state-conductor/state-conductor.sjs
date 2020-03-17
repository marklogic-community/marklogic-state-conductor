'use strict';

const TRACE_EVENT = 'state-conductor';

const STATE_CONDUCTOR_JOBS_DB = 'state-conductor-jobs';
const STATE_CONDUCTOR_TRIGGERS_DB = 'state-conductor-triggers';
const STATE_CONDUCTOR_SCHEMAS_DB = 'state-conductor-schemas';

const FLOW_FILE_EXTENSION = '.asl.json';
const FLOW_ITEM_COLLECTION = 'state-conductor-item';
const JOB_COLLECTION = 'stateConductorJob';
const FLOW_COLLECTION = 'state-conductor-flow';
const FLOW_DIRECTORY = '/state-conductor-flow/';
const FLOW_JOBID_PROP_NAME = 'state-conductor-job';
const FLOW_STATUS_NEW = 'new';
const FLOW_STATUS_WORKING = 'working';
const FLOW_STATUS_WATING = 'waiting';
const FLOW_STATUS_COMPLETE = 'complete';
const FLOW_STATUS_FAILED = 'failed';
const FLOW_NEW_STEP = "NEW";
const DATE_TIME_REGEX = "^[-]?((1[6789]|[2-9][0-9])[0-9]{2}-(0[13578]|1[02])-(0[1-9]|[12][0-9]|3[01]))T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|\.[0-9]{4}|[-|\+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?((1[6789]|[2-9][0-9])[0-9]{2}-(0[469]|11)-(0[1-9]|[12][0-9]|30))T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|\.[0-9]{4}|[-|\+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?((16|[248][048]|[3579][26])00)|(1[6789]|[2-9][0-9])(0[48]|[13579][26]|[2468][048])-02-(0[1-9]|1[0-9]|2[0-9])T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|\.[0-9]{4}|[-|\+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$|^[-]?(1[6789]|[2-9][0-9])[0-9]{2}-02-(0[1-9]|1[0-9]|2[0-8])T([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])([Z]|\.[0-9]{4}|[-|\+]([0-1][0-9]|2[0-3]):([0-5][0-9]))?$";

const SUPPORTED_STATE_TYPES = [
  'choice',
  'fail',
  'pass',
  'succeed',
  'task',
  'wait'
];

const parseSerializedQuery = (serializedQuery) => {
  return cts.query(fn.head(xdmp.fromJsonString(serializedQuery)));
};

/**
 * Gets a flow definition by flowName
 *
 * @param {*} name
 * @returns
 */
function getFlowDocument(name) {
  let nameWithExtension = fn.normalizeSpace(name) + FLOW_FILE_EXTENSION;
  const uri = fn.head(cts.uriMatch('*' + nameWithExtension,
    [
      'document',
      'case-sensitive'
    ],
    cts.collectionQuery(FLOW_COLLECTION)
  ));

  if (fn.docAvailable(uri)) {
    return cts.doc(uri);
  } else {
    return fn.error(null, 'MISSING-FLOW-FILE', 'Cannot find a a flow file with the name: ' + name);
  }
}

function getFlowDocumentFromDatabase(name, databaseId) {
  let resp = xdmp.invokeFunction(() => {
    return getFlowDocument(name);
  }, {
    database: databaseId
  });
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
  return cts.uris('/', ['document'], cts.collectionQuery(FLOW_COLLECTION)).toArray().map(uri => getFlowNameFromUri(uri));
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
  return uri.lastIndexOf(FLOW_FILE_EXTENSION) !== -1 ? uri.slice(0, uri.lastIndexOf(FLOW_FILE_EXTENSION)) : uri;
}

/**
 * Returns the initial state for the given state machine definition
 *
 * @param {*} { flowName, StartAt }
 * @returns
 */
function getInitialState({ flowName, StartAt }) {
  if (!StartAt || StartAt.length === 0) {
    fn.error(null, 'INVALID-STATE-DEFINITION', `no "StartAt" defined for state machine "${flowName}"`);
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
  if (fn.docAvailable(uri)) {
    return xdmp.documentGetProperties(uri, fn.QName('', FLOW_JOBID_PROP_NAME))
      .toArray()
      .filter(prop => prop.getAttributeNode('flow-name').nodeValue === flowName);
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
  builder.addAttribute('date', (new Date()).toISOString());
  builder.endElement();
  let jobMetaElem = builder.toNode();
  xdmp.documentAddProperties(uri, [jobMetaElem]);
}

function getJobIds(uri, flowName) {
  const jobProps = getJobMetadatProperty(uri, flowName);
  return jobProps.map(prop => prop.getAttributeNode('job-id').nodeValue);
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
    const uris = cts.uris('', 'limit=1', cts.andQuery([
      cts.documentQuery(uri),
      query
    ]));
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
  const flows = getFlowDocuments().toArray().filter(flow => {
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
  let queries = context.map(ctx => {
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
  let queries = getFlowDocuments().toArray().map(flow => getFlowContextQuery(flow.toObject()));

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
  xdmp.trace(TRACE_EVENT, `state-conductor job processing for job document "${uri}"`);
  // sanity check
  if (!fn.docAvailable(uri)) {
    fn.error(null, 'INVALID-JOB-DOCUMENT', `State Conductor job document "${uri}" not found!`);
  }
  // check the flow state
  const jobDoc = cts.doc(uri);
  const job = jobDoc.toObject();
  const status = job.flowStatus;

  if (FLOW_STATUS_WORKING === status) {
    // execute state actions and transition to next state
    executeStateByJobDoc(jobDoc);
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
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const currFlowName = jobObj.flowName;
  const status = jobObj.flowStatus;

  try {

    // sanity check
    if (FLOW_STATUS_NEW !== status) {
      fn.error(null, 'INVALID-FLOW-STATUS', 'Cannot start a flow not in the NEW status');
    }

    // grab the flow definition from the correct db
    const currFlow = getFlowDocumentFromDatabase(currFlowName, jobObj.database).toObject();
    currFlow.flowName = jobObj.flowName;
    let initialState = getInitialState(currFlow);

    // update job state, status, and provenence
    jobObj.flowStatus = FLOW_STATUS_WORKING;
    jobObj.flowState = initialState;

    xdmp.trace(TRACE_EVENT, `adding document to flow: "${currFlowName}" in state: "${initialState}"`);

    jobObj.provenance.push({
      date: (new Date()).toISOString(),
      from: FLOW_NEW_STEP,
      to: initialState
    });

    if (save) {
      xdmp.nodeReplace(jobDoc.root, jobObj);
    }

  } catch (err) {
    handleError(err.name, `startProcessingFlowByJobDoc error for flow "${currFlowName}"`, err, jobObj, save);
  }
  return jobObj
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} uri - the job document's uri
 */
function resumeWaitingJob(uri, resumeBy = 'unknonw', save = true) {
//ike testing trace
  xdmp.trace(TRACE_EVENT, `check if resumeWaiting is working "${uri}"`);
  const jobDoc = cts.doc(uri);
  resumeWaitingJobByJobDoc(jobDoc, resumeBy, save)
};

function resumeWaitingJobByJobDoc(jobDoc, resumeBy, save = true) {
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

  try {

    // sanity check
    if (FLOW_STATUS_WATING !== flowStatus) {
      return fn.error(null, 'INVALID-FLOW-STATUS', 'Cannot resume a flow that is not in the WAITING status');
    }

    flowObj = getFlowDocumentFromDatabase(flowName, jobObj.database).toObject();

    try {
      state = flowObj.States[stateName];
    } catch (e) {
      return fn.error(null, 'INVALID-STATE-DEFINITION', `Can't Find the state "${stateName}" in flow "${flowName}"`);
    }

  } catch (err) {
    handleError(err.name, `resumeWaitingJobByJobDoc error for flow "${flowName}"`, err, jobObj, save);
  }

  try {
    //removes old waiting data
    delete jobObj.currentlyWaiting;

    jobObj.flowStatus = FLOW_STATUS_WORKING;
    jobObj.provenance.push({
      date: (new Date()).toISOString(),
      state: stateName,
      resumeBy: resumeBy
    });

    return transition(jobDoc, jobObj, stateName, state, flowObj, save)
  } catch (err) {
    return handleStateFailure(uri, flowName, flowObj, stateName, err, save);
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
  try {
    // determine the next target state and transition
    let targetState = null;

    xdmp.trace(TRACE_EVENT, `executing transitions for state: ${stateName} with status of ${jobObj.flowStatus}`);

    if (jobObj.flowStatus === FLOW_STATUS_WATING) {
      xdmp.trace(TRACE_EVENT, `transition wait: ${stateName}`);

      jobObj.provenance.push({
        date: (new Date()).toISOString(),
        state: stateName,
        waiting: jobObj.currentlyWaiting
      });

    } else if (!inTerminalState(jobObj, flowObj)) {
      xdmp.trace(TRACE_EVENT, `transition from non-terminal state: ${stateName}`);

      if ('task' === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if ('pass' === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if ('wait' === state.Type.toLowerCase()) {
        targetState = state.Next;
      } else if ('choice' === state.Type.toLowerCase()) {
        try {
          if (state.Choices && state.Choices.length > 0) {
            state.Choices.forEach(choice => {
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
                        modules: jobObj.modules
                      }
                    )
                  );
                  targetState = resp ? choice.Next : null;
                } else {
                  fn.error(null, 'INVALID-STATE-DEFINITION', `Choices defined without "Resource" in state "${stateName}"`);
                }
              }
            });
            targetState = targetState || state.Default;
          } else {
            fn.error(null, 'INVALID-STATE-DEFINITION', `no "Choices" defined for Choice state "${stateName}" `);
          }
        } catch (err) {
          return handleStateFailure(xdmp.nodeUri(jobDoc), flowObj.flowName, flowObj, stateName, err, save);
        }
      } else {
        fn.error(null, 'INVALID-STATE-DEFINITION', `unsupported transition from state type "${stateName.Type}"` + xdmp.quote(state));
      }

      // perform the transition
      if (targetState) {
        jobObj.flowState = targetState;

        jobObj.provenance.push({
          date: (new Date()).toISOString(),
          from: stateName,
          to: targetState
        });

      } else {
        fn.error(null, 'INVALID-STATE-DEFINITION', `No suitable transition found in non-terminal state "${stateName}"`);
      }
    } else {

      xdmp.trace(TRACE_EVENT, `transition complete: ${stateName}`);

      // terminal states have no "Next" target state
      jobObj.flowStatus = FLOW_STATUS_COMPLETE;

      jobObj.provenance.push({
        date: (new Date()).toISOString(),
        from: stateName,
        to: 'COMPLETED'
      });
    }

    // update the state status and provenence in the job doc
    if (save) {
      xdmp.nodeReplace(jobDoc.root, jobObj);
    }

  } catch (err) {
    handleError('TRANSITIONERROR', `transition error for state "${stateName}"`, err, jobObj, save);
  }

  return jobObj
}

/**
 * Performs the actions and transitions for a state.
 *
 * @param {*} jobDoc - the job document
 */
function executeStateByJobDoc(jobDoc, save = true) {
  const uri = xdmp.nodeUri(jobDoc);
  const jobObj = scaffoldJobDoc(jobDoc.toObject());
  const flowName = jobObj.flowName;
  const stateName = jobObj.flowState;
  let state;
  let flowObj;
  xdmp.trace(TRACE_EVENT, `executing flow "${flowName}"`);
  xdmp.trace(TRACE_EVENT, `flow state "${stateName}"`);

  try {

    // sanity check
    if (FLOW_STATUS_WORKING !== jobObj.flowStatus) {
      return fn.error(null, 'INVALID-FLOW-STATUS', 'Cannot execute a flow that is not in the WORKING status');
    }

    flowObj = getFlowDocumentFromDatabase(flowName, jobObj.database).toObject();

    try {
      state = flowObj.States[stateName];
    } catch (e) {
      return fn.error(null, 'INVALID-STATE-DEFINITION', `Can't Find the state "${stateName}" in flow "${flowName}"`);
    }

  } catch (err) {
    handleError(err.name, `executeStateByJobDoc error for flow "${flowName}"`, err, jobObj, save);
  }

  if (state) {
    try {
      //removes old waiting data
      delete jobObj.currentlyWaiting;

      // perform the actions for the "Task" state
      if (state.Type && state.Type.toLowerCase() === 'task') {
        xdmp.trace(TRACE_EVENT, `executing action for state: ${stateName}`);

        if (state.Resource) {
          // execute the resource modules
          let resp = executeActionModule(
            state.Resource,
            jobObj.uri,
            state.Parameters,
            jobObj.context,
            {
              database: jobObj.database,
              modules: jobObj.modules
            });

          // update the job context with the response
          jobObj.context = resp;
        } else {
          fn.error(null, 'INVALID-STATE-DEFINITION', `no "Resource" defined for Task state "${stateName}"`);
        }
      } else if (state.Type && state.Type.toLowerCase() === 'wait' && state.hasOwnProperty('Event')) {
        //updated the job Doc to have info about why its waiting
        xdmp.trace(TRACE_EVENT, `waiting for state: ${stateName}`);

        if (state.Event) {
          jobObj.currentlyWaiting = {
            event: state.Event
          }
          jobObj.flowStatus = FLOW_STATUS_WATING
        } else {
          fn.error(null, 'INVALID-STATE-DEFINITION', `no "Event" defined for Task state "${stateName}"`);
        }
      }
       else if (state.Type && state.Type.toLowerCase() === 'wait' && state.hasOwnProperty('Seconds')) {
        //updated the job Doc to have info about why its waiting
        xdmp.trace(TRACE_EVENT, `waiting for state: ${stateName}`);
        if (state.Seconds) {
          let waitTime = Number(state.Seconds)
          let WaitTimeToMinutes = Math.floor(waitTime / 60);
          let currentTime = fn.currentDateTime()
          let WaitTimeToSeconds = waitTime - WaitTimeToMinutes * 60;
          let nextTaskTime = currentTime.add(xs.dayTimeDuration("PT" + WaitTimeToMinutes + "M" + WaitTimeToSeconds + "S"));
          xdmp.trace(TRACE_EVENT, `waiting for state nextTaskTime : ${nextTaskTime}`);
          jobObj.currentlyWaiting = {
            seconds: state.Seconds,
            nextTaskTime: nextTaskTime
          }
          jobObj.flowStatus = FLOW_STATUS_WATING
        } else {
          fn.error(null, 'INVALID-STATE-DEFINITION', `no "Seconds" defined for Task state "${stateName}"`);
          }
      }
       else if (state.Type && state.Type.toLowerCase() === 'wait' && state.hasOwnProperty('Timestamp')) {
        //updated the job Doc to have info about why its waiting
        xdmp.trace(TRACE_EVENT, `waiting for state Timestamp : ${stateName}`);
        if (state.Timestamp) {
          xdmp.trace(TRACE_EVENT, ` timestamp  value is : ${state.Timestamp}`);
          let timestamp = state.Timestamp
          if (fn.matches(timestamp, DATE_TIME_REGEX)) {
             xdmp.trace(TRACE_EVENT, ` pass regex check  value is : ${timestamp}`);
             let nextTaskTime = xdmp.parseDateTime('[Y0001]-[M01]-[D01]T[H01]:[m01]:[f1]', timestamp)
             if (nextTaskTime < fn.currentDateTime()) {
               xdmp.trace(TRACE_EVENT, `Time for Schedule task has passed : ${nextTaskTime}`);
             }
              jobObj.currentlyWaiting = {
              timestamp: timestamp,
              nextTaskTime: nextTaskTime
            }
          } else {
            fn.error(null, 'INVALID-STATE-DEFINITION', ` "Timestamp" not valid time for Task state "${stateName}"`);
            }

          jobObj.flowStatus = FLOW_STATUS_WATING
        } else {
          fn.error(null, 'INVALID-STATE-DEFINITION', `no "Timestamp" defined for Task state "${stateName}"`);
        }
      }
    } catch (err) {
      return handleStateFailure(uri, flowName, flowObj, stateName, err, save);
    }
    return transition(jobDoc, jobObj, stateName, state, flowObj, save);
  } else {
    handleError('INVALID-STATE-DEFINITION', Sequence.from([`state "${stateName}" not found in flow`]), null, jobObj, save);
  }
}

function executeActionModule(modulePath, uri, params, context, { database, modules }) {
  let resp = xdmp.invokeFunction(() => {
    const actionModule = require(modulePath);
    if (typeof actionModule.performAction === 'function') {
      return actionModule.performAction(uri, params, context);
    } else {
      fn.error(null, 'INVALID-STATE-DEFINITION', `no "performAction" function defined for action module "${modulePath}"`);
    }
  }, {
    database: database ? database : xdmp.database(),
    modules: modules ? modules : xdmp.modulesDatabase()
  });
  return fn.head(resp);
}

function executeConditionModule(modulePath, uri, params, context, { database, modules }) {
  let resp = xdmp.invokeFunction(() => {
    const conditionModule = require(modulePath);
    if (typeof conditionModule.checkCondition === 'function') {
      return conditionModule.checkCondition(uri, params, context);
    } else {
      fn.error(null, 'INVALID-STATE-DEFINITION', `no "checkCondition" function defined for condition module "${modulePath}"`);
    }
  }, {
    database: database ? database : xdmp.database(),
    modules: modules ? modules : xdmp.modulesDatabase()
  });
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
 * @returns
 */
function handleStateFailure(uri, flowName, flow, stateName, err, save = true) {
  const currState = flow.States[stateName];
  xdmp.trace(TRACE_EVENT, `handling state failures for state: ${stateName}`);
  xdmp.trace(TRACE_EVENT, Sequence.from([err]));

  if (!fn.docAvailable(uri)) {
    return fn.error(null, 'DOCUMENT-NOT-FOUND', Sequence.from([`the document URI of "${uri}" was not found.`, err]));
  }

  const jobDoc = cts.doc(uri);
  const jobObj = jobDoc.toObject();

  if (currState && (
    'task' === currState.Type.toLowerCase() ||
    'choice' === currState.Type.toLowerCase())) {
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
          date: (new Date()).toISOString(),
          from: stateName,
          to: target
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
  return handleError('INVALID-STATE-DEFINITION', `no Catch defined for error "${err.name}" in state "${stateName}"`, err, jobObj, save)
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
    currState.Type.toLowerCase() === 'succeed' ||
    currState.Type.toLowerCase() === 'fail' ||
    (currState.Type.toLowerCase() === 'task' && currState.End === true)
  );
}

/**
 * Calculates the state of documents being processed by, and completed through this flow
 *
 * @param {*} flowName
 * @returns
 */
function getFlowCounts(flowName, { startDate, endDate }) {
  const flow = getFlowDocument(flowName).toObject();
  const states = Object.keys(flow.States);

  let baseQuery = [];
  if (startDate) {
    baseQuery.push(cts.jsonPropertyRangeQuery('createdDate', '>=', xs.dateTime(startDate)));
  }
  if (endDate) {
    baseQuery.push(cts.jsonPropertyRangeQuery('createdDate', '<=', xs.dateTime(endDate)))
  }

  const numInStatus = (status) => fn.count(
    cts.uris('', null,
      cts.andQuery([].concat(
        baseQuery,
        cts.jsonPropertyValueQuery('flowName', flowName),
        cts.jsonPropertyValueQuery('flowStatus', status)
      ))
    )
  );

  const numInState = (status, state) => fn.count(
    cts.uris('', null,
      cts.andQuery([].concat(
        baseQuery,
        cts.jsonPropertyValueQuery('flowName', flowName),
        cts.jsonPropertyValueQuery('flowStatus', status),
        cts.jsonPropertyValueQuery('flowState', state)
      ))
    )
  );

  let numComplete = 0;
  let numWorking = 0;
  let numNew = 0;
  let numFailed = 0;

  const resp = {
    flowName: flowName,
    totalComplete: numComplete,
    totalWorking: numWorking,
    totalFailed: numFailed,
    totalNew: numNew
  };

  xdmp.invokeFunction(() => {
    resp.totalComplete = numInStatus(FLOW_STATUS_COMPLETE);
    resp.totalWorking = numInStatus(FLOW_STATUS_WORKING);
    resp.totalNew = numInStatus(FLOW_STATUS_NEW);
    resp.totalFailed = numInStatus(FLOW_STATUS_FAILED);

    [FLOW_STATUS_WORKING, FLOW_STATUS_COMPLETE].forEach(status => {
      resp[status] = {};
      states.forEach(state => {
        resp[status][state] = numInState(status, state);
      });
    });
  }, {
    database: xdmp.database(STATE_CONDUCTOR_JOBS_DB)
  });

  return resp;
}

// checks if its a temporal document and if its latested document
function isLatestTemporalDocument(uri) {
  const temporal = require('/MarkLogic/temporal.xqy');
  const temporalCollections = temporal.collections().toArray();
  const documentCollections = xdmp.documentGetCollections(uri);

  const hasTemporalCollection = temporalCollections.some(collection => {
    //the temporalCollections are not strings so we need to convert them into strings
    return documentCollections.includes(collection.toString());
  });

  return ((hasTemporalCollection.length > 0) && documentCollections.includes('latest'));
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
    errors: {}
  };

  return Object.assign(needProps, jobDoc)
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
    createdDate: (new Date()).toISOString(),
    context: context,
    provenance: []
  });

  // insert the job document
  xdmp.trace(TRACE_EVENT, `inserting job document: ${jobUri} into db ${STATE_CONDUCTOR_JOBS_DB}`);
  xdmp.invokeFunction(() => {
    declareUpdate();
    xdmp.documentInsert(jobUri, job, {
      collections: collections,
      permissions: xdmp.defaultPermissions()
    });
  }, {
    database: xdmp.database(STATE_CONDUCTOR_JOBS_DB)
  });

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
  const ids = uris.map(uri => createStateConductorJob(flowName, uri, context, options));
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
  let uris =

    xdmp.invokeFunction(() => {
      let waitingURIJobsForEvent =

        cts.uris(null, null,
          cts.andQuery([
            cts.collectionQuery(JOB_COLLECTION),
            cts.jsonPropertyValueQuery("flowStatus", FLOW_STATUS_WATING),
            cts.jsonPropertyScopeQuery("currentlyWaiting", cts.jsonPropertyValueQuery("event", event))
          ])
        ).toArray()
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

          xdmp.spawn(
            "/state-conductor/resumeWaitingJobs.sjs",
            {
              "uriArray": uriArray,
              "resumeBy": "emmit event: " + event,
              "save": save
            }
          )

        })
      }
      return waitingURIJobsForEvent
    }, {
      database: xdmp.database(STATE_CONDUCTOR_JOBS_DB)
    });


  return fn.head(uris)

}

/**
 * Given a flow context with the "scheduled" scope, determines
 * if the scheduled period has elapsed.
 *
 * @param {*} context
 * @returns
 */
function hasScheduleElapsed(context, now) {
  if (context.scope !== 'scheduled') {
    return false;
  }

  now = now || new Date();
  const millis = now.getTime();
  const minutes = Math.floor(millis / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const dayname = xdmp.daynameFromDate(now);

  try {
    if ('minutely' === context.value) {
      // checks periodicity
      return (minutes % context.period) === 0;
    } else if ('hourly' === context.value) {
      // checks periodicity and the number of minutes past the hour
      const periodMatch = (hours % context.period) === 0;
      const m = context.minute;
      return periodMatch && (fn.minutesFromDateTime(now) === parseInt(m));
    } else if ('daily' === context.value) {
      // checks periodicity and if we've arrived at the specified time
      const periodMatch = (days % context.period) === 0;
      const [h, m] = context.startTime.split(':');
      return periodMatch && (fn.hoursFromDateTime(now) === parseInt(h)) && (fn.minutesFromDateTime(now) === parseInt(m));
    } else if ('weekly' === context.value) {
      // checks periodicity and if we've arrived at the specified time and day(s) of the week
      // periodicity check uses the week number for the current year (1-52)
      const periodMatch = (xdmp.weekFromDate(now) % context.period) === 0;
      const dayMatch = context.days.map(day => day.toLowerCase()).includes(dayname.toLowerCase());
      const [h, m] = context.startTime.split(':');
      return periodMatch && dayMatch && (fn.hoursFromDateTime(now) === parseInt(h)) && (fn.minutesFromDateTime(now) === parseInt(m));
    } else if ('monthly' === context.value) {
      // checks periodicity and if we've arrived at the specified time and day of the week
      // periodicity check uses the month number for the current year (1-12)
      // day check uses the day number of the month (1 - 31)
      const periodMatch = (fn.monthFromDate(now) % context.period) === 0;
      const dayMatch = fn.dayFromDateTime(now) === context.monthDay;
      const [h, m] = context.startTime.split(':');
      return periodMatch && dayMatch && (fn.hoursFromDateTime(now) === parseInt(h)) && (fn.minutesFromDateTime(now) === parseInt(m));
    } else if ('once' === context.value) {
      // checks if we've arrived at the specified date and time
      // generates a range of one minute from specified time and validates the current time is within that minute
      const start = xdmp.parseDateTime('[M01]/[D01]/[Y0001]-[H01]:[m01][Z]', `${context.startDate}-${context.startTime}Z`);
      const upper = start.add("PT1M");
      return start.le(now) && upper.gt(now);
    }
  } catch (ex) {
    xdmp.log(`error parsing schedule values: ${JSON.stringify(context)}`);
  }

  return false;
}


/**
 * Query for job document uris, matching the given options
 *
 * @param {*} options
 * @returns
 */
function getJobDocuments(options) {
  const count = options.count || 100;
  const flowStatus = Array.isArray(options.flowStatus) ? options.flowStatus : [FLOW_STATUS_NEW, FLOW_STATUS_WORKING];
  const flowNames = Array.isArray(options.flowNames) ? options.flowNames : [];
  let uris = [];

  xdmp.invokeFunction(() => {
    const queries = [
      cts.collectionQuery('stateConductorJob'),
      cts.jsonPropertyValueQuery('flowStatus', flowStatus)
    ];

    if (flowNames.length > 0) {
      queries.push(cts.jsonPropertyValueQuery('flowName', flowNames));
    }
    if (options.startDate) {
      queries.push(cts.jsonPropertyRangeQuery('createdDate', '>=', xs.dateTime(options.startDate)));
    }
    if (options.endDate) {
      queries.push(cts.jsonPropertyRangeQuery('createdDate', '<=', xs.dateTime(options.endDate)));
    }

    uris = uris.concat(cts.uris("", ["document", `limit=${count}`], cts.andQuery(queries)).toArray());
  }, {
    database: xdmp.database(STATE_CONDUCTOR_JOBS_DB)
  });

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
function handleError(name, message, err, jobObj, save = true) {
  xdmp.trace(TRACE_EVENT, name + ":" + message);
  const state = jobObj.flowState || FLOW_NEW_STEP;

  // update the job document
  jobObj.flowStatus = FLOW_STATUS_FAILED;
  jobObj.errors[state] = err;

  if (save) {
    xdmp.nodeReplace(jobDoc.root, jobObj);
  }

  // trigger CPF error state
  fn.error(null, name, Sequence.from([
    message,
    err
  ]));

  return jobObj
}

module.exports = {
  TRACE_EVENT,
  STATE_CONDUCTOR_JOBS_DB,
  STATE_CONDUCTOR_TRIGGERS_DB,
  STATE_CONDUCTOR_SCHEMAS_DB,
  FLOW_COLLECTION,
  FLOW_DIRECTORY,
  FLOW_ITEM_COLLECTION,
  FLOW_STATUS_NEW,
  FLOW_STATUS_WORKING,
  FLOW_STATUS_COMPLETE,
  FLOW_STATUS_FAILED,
  JOB_COLLECTION,
  addJobMetadata,
  batchCreateStateConductorJob,
  checkFlowContext,
  createStateConductorJob,
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
  getJobIds,
  processJob,
  resumeWaitingJob,
  resumeWaitingJobByJobDoc,
  executeStateByJobDoc,
  startProcessingFlowByJobDoc,
  emmitEvent,
  getJobDocuments,
  hasScheduleElapsed
};
