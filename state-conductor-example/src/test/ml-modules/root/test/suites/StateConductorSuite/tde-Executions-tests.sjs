'use strict';

const test = require('/test/test-helper.xqy');
const sc = require('/state-conductor/state-conductor.sjs');

const assertions = [];

//quries the excutions database for the tde view
const tdeView = fn.head(xdmp.invokeFunction(() => { return tde.getView("StateConductor","Executions") }, {database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB) })).view

//converts the columns array to an object with the name and their scalarType type
const columns = tdeView.columns.reduce((acc,curr)=> (acc[curr.column.name]=curr.column.scalarType,acc),{});

assertions.push(test.assertEqual('Executions', tdeView.name, 'view name'));
assertions.push(test.assertEqual('StateConductor', tdeView.schema, 'schema name'));

assertions.push(test.assertEqual('string', columns.id, 'columns id'));
assertions.push(test.assertEqual('string', columns.name, 'columns name'));
assertions.push(test.assertEqual('string', columns.status, 'columns status'));
assertions.push(test.assertEqual('string', columns.state, 'columns state'));
assertions.push(test.assertEqual('string', columns.uri, 'columns uri'));
assertions.push(test.assertEqual('dateTime', columns.createdDate, 'columns createdDate'));
assertions.push(test.assertEqual('string', columns.databaseID, 'columns databaseID'));
assertions.push(test.assertEqual('string', columns.modulesID, 'columns modulesID'));


//quries the excutions database for to see have there are documents that match the query
const sql = xdmp.invokeFunction(() => { return xdmp.sql("select * from Executions limit 10", "map") }, {database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB) })

assertions.push(test.assertEqual(10, fn.count(sql), 'sql'));

assertions

