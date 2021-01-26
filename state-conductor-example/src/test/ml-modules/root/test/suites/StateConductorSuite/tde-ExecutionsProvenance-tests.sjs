'use strict';

const test = require('/test/test-helper.xqy');
const sc = require('/state-conductor/state-conductor.sjs');

const assertions = [];

//quries the excutions database for the tde view
const tdeView = fn.head(xdmp.invokeFunction(() => { return tde.getView("StateConductor","ExecutionsProvenance") }, {database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB) })).view

//converts the columns array to an object with the name and their scalarType type
const columns = tdeView.columns.reduce((acc,curr)=> (acc[curr.column.name]=curr.column.scalarType,acc),{});

assertions.push(test.assertEqual('ExecutionsProvenance', tdeView.name, 'view name'));
assertions.push(test.assertEqual('StateConductor', tdeView.schema, 'schema name'));
assertions.push(test.assertEqual('string', columns.id, 'columns id'));
assertions.push(test.assertEqual('string', columns.from, 'columns from'));
assertions.push(test.assertEqual('string', columns.to, 'columns to'));
assertions.push(test.assertEqual('dayTimeDuration', columns.executionTime, 'columns executionTime'));
assertions.push(test.assertEqual('dateTime', columns.date, 'columns date'));

//quries the excutions database for to see have there are documents that match the query
const sql = xdmp.invokeFunction(() => { return xdmp.sql("select * from ExecutionsProvenance limit 10", "map") }, {database: xdmp.database(sc.STATE_CONDUCTOR_EXECUTIONS_DB) })

assertions.push(test.assertEqual(10, fn.count(sql), 'sql'));

assertions
