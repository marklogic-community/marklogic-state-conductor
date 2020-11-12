'use strict';

const sc = require('/state-conductor/state-conductor.sjs');

function returnError(statusCode, statusMsg, body) {
  fn.error(
    null,
    'RESTAPI-SRVEXERR',
    Sequence.from([statusCode, statusMsg, body])
  );
}

/**
 * resumes the executions with the URIS sent
 */
function put(context, { uris = [], resumeBy = 'unspecified' }, input) {
  if (typeof uris === 'string') {
    uris = uris.split(',');
  }

  if (uris.length === 0) {
    returnError(400, 'Bad Request', 'Missing required parameter "uris"');
  }

  resumeBy = 'Rest Endpoint:' + resumeBy;

  const resp = {
    uris: [],
    executions: {},
  };

  //runs the update in the executions database
  sc.invokeOrApplyFunction(
    () => {
      declareUpdate();

      uris.forEach(function (uri) {
        resp.uris.push(uri);

        resp.executions[uri] = sc.resumeWaitingExecution(uri, resumeBy);
      });
    },
    {
      database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB),
    }
  );

  context.outputStatus = [200, 'OK'];
  return resp;
}

exports.PUT = put;
