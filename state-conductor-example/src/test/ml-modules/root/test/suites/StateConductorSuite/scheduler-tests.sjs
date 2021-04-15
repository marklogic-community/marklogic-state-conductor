'use strict';

const scLib = require('/state-conductor/state-conductor-lib.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let context = {};
let dt = fn.currentDateTime();

function addMinutes(date, minutes) {
  return date.add(xs.dayTimeDuration(`PT${minutes}M`));
}

// minutely tests
context = {
  scope: 'scheduled',
  value: 'minutely',
  period: 1,
};
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 61)))
);
context = {
  scope: 'scheduled',
  value: 'minutely',
  period: 2,
};
dt = xs.dateTime('2000-01-01T00:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 2))),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 3)))
);
context = {
  scope: 'scheduled',
  value: 'minutely',
  period: 5,
};
dt = xs.dateTime('2000-01-01T00:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 5))),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 4))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 10))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 15)))
);

// hourly tests
context = {
  scope: 'scheduled',
  value: 'hourly',
  period: 1,
  minute: 0,
};
dt = xs.dateTime('2000-01-01T00:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 60))),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 59))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 60 * 5))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-05T10:00:43Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-05T10:30:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'hourly',
  period: 2,
  minute: 30,
};
dt = xs.dateTime('2000-01-01T00:00:00-05:00');
assertions.push(
  test.assertFalse(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 30))),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 31))),
  test.assertFalse(scLib.hasScheduleElapsed(context, addMinutes(dt, 60))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 150))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-05T14:00:43-05:00'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-05T14:30:43-05:00')))
);

// daily tests
context = {
  scope: 'scheduled',
  value: 'daily',
  period: 1,
  startTime: '12:00',
};
dt = xs.dateTime('2000-01-01T00:00:00Z');
assertions.push(
  test.assertFalse(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, addMinutes(dt, 60 * 12))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-12T12:00:59Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-12T12:01:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-12T11:59:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'daily',
  period: 2,
  startTime: '19:15',
};
dt = xs.dateTime('2000-01-01T19:00:00Z');
assertions.push(
  test.assertFalse(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T19:15:30Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-02T19:15:30Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-03T19:15:30Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-04T19:15:30Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-04T19:16:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-04T19:14:59Z')))
);

// weekly tests
context = {
  scope: 'scheduled',
  value: 'weekly',
  period: 1,
  days: ['monday', 'wednesday', 'friday'],
  startTime: '12:00',
};
dt = xs.dateTime('2020-01-06T12:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-07T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-08T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-09T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-10T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-11T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-12T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-08T11:59:59Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-08T12:01:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'weekly',
  period: 1,
  days: ['tuesday', 'thursday', 'saturday', 'sunday'],
  startTime: '12:00',
};
dt = xs.dateTime('2020-01-06T12:00:00Z');
assertions.push(
  test.assertFalse(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-07T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-08T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-09T12:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-10T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-11T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-12T12:00:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'weekly',
  period: 2,
  days: ['monday', 'friday'],
  startTime: '02:30',
};
dt = xs.dateTime('2020-01-06T02:30:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-10T02:30:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-13T02:30:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-17T02:30:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-20T02:30:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-24T02:30:00Z')))
);

// monthly tests
context = {
  scope: 'scheduled',
  value: 'monthly',
  period: 1,
  monthDay: 1,
  startTime: '20:00',
};
dt = xs.dateTime('2020-01-01T20:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-01T20:01:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-01T19:59:59Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-02T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-02-01T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-03-01T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-06-01T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-01T20:00:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'monthly',
  period: 3,
  monthDay: 5,
  startTime: '01:27',
};
dt = xs.dateTime('2020-01-05T01:27:00Z');
assertions.push(
  test.assertFalse(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-02-05T01:27:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-03-05T01:27:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-04-05T01:27:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-06-05T01:27:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-08-05T01:27:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-09-05T01:27:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-11-05T01:27:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-05T01:27:00Z')))
);
context = {
  scope: 'scheduled',
  value: 'monthly',
  period: 1,
  monthDay: 31,
  startTime: '20:00',
};
dt = xs.dateTime('2020-01-31T20:00:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-02-29T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-03-31T20:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-04-30T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-07-31T20:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-11-30T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-12-31T20:00:00Z')))
);

// once tests
context = {
  scope: 'scheduled',
  value: 'once',
  startDate: '01/15/2020',
  startTime: '10:59',
};
dt = xs.dateTime('2020-01-15T10:59:00Z');
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, dt)),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:59Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T11:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:58:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-14T10:59:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-16T10:59:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-02-15T10:59:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2021-01-15T10:59:00Z')))
);

// timezone tests
context = {
  scope: 'scheduled',
  value: 'daily',
  period: 1,
  startTime: '20:00',
};
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T20:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T20:00:00-04:00'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T16:00:00-04:00'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T20:00:00-05:00'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2000-01-01T15:00:00-05:00')))
);
context = {
  scope: 'scheduled',
  value: 'weekly',
  period: 1,
  days: ['monday', 'wednesday', 'friday'],
  startTime: '12:00',
};
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-06T12:00:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-06T12:00:00-05:00'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-06T12:00:00+02:00')))
);
context = {
  scope: 'scheduled',
  value: 'once',
  startDate: '01/15/2020',
  startTime: '10:59',
};
assertions.push(
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:00Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:00-05:00'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:00+05:00'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:59Z'))),
  test.assertTrue(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:59:59-05:00'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T11:00:00Z'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T10:58:00-05:00'))),
  test.assertFalse(scLib.hasScheduleElapsed(context, xs.dateTime('2020-01-15T05:58:00-05:00')))
);

// return
assertions;
