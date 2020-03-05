'use strict';

const sc   = require('/state-conductor/state-conductor.sjs');
const test = require('/test/test-helper.xqy');

const assertions = [];
let context = {};
let dt = new Date();

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// minutely tests
context = {
  "scope": "scheduled",
  "value": "minutely",
  "period": 1
};
assertions.push(
  test.assertTrue(sc.hasScheduleElapsed(context, dt)),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 61)))
);
context = {
  "scope": "scheduled",
  "value": "minutely",
  "period": 2
};
dt = new Date('2000-01-01T00:00:00');
assertions.push(
  test.assertTrue(sc.hasScheduleElapsed(context, dt)),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 2))),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 3))),
);
context = {
  "scope": "scheduled",
  "value": "minutely",
  "period": 5
};
dt = new Date('2000-01-01T00:00:00');
assertions.push(
  test.assertTrue(sc.hasScheduleElapsed(context, dt)),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 5))),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 4))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 10))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 15))),
);

// hourly tests
context = {
  "scope": "scheduled",
  "value": "hourly",
  "period": 1,
  "minute": 0
};
dt = new Date('2000-01-01T00:00:00');
assertions.push(
  test.assertTrue(sc.hasScheduleElapsed(context, dt)),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 1))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 60))),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 59))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 60 * 5))),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2020-01-05T10:00:43'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2020-01-05T10:30:00'))),
);
context = {
  "scope": "scheduled",
  "value": "hourly",
  "period": 2,
  "minute": 30
};
dt = new Date('2000-01-01T00:00:00');
assertions.push(
  test.assertFalse(sc.hasScheduleElapsed(context, dt)),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 30))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 90))),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 91))),
  test.assertFalse(sc.hasScheduleElapsed(context, addMinutes(dt, 150))),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2020-01-05T11:30:43'))),
);

// daily tests
context = {
  "scope": "scheduled",
  "value": "daily",
  "period": 1,
  "startTime": "12:00"
};
dt = new Date('2000-01-01T00:00:00Z');
assertions.push(
  test.assertFalse(sc.hasScheduleElapsed(context, dt)),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2000-01-01T12:00:00Z'))),
  test.assertTrue(sc.hasScheduleElapsed(context, addMinutes(dt, 60 * 12))),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2020-12-12T12:00:59Z'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2020-12-12T12:01:00'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2020-12-12T11:59:00')))
);
context = {
  "scope": "scheduled",
  "value": "daily",
  "period": 2,
  "startTime": "19:15"
};
dt = new Date('2000-01-01T19:00:00Z');
assertions.push(
  test.assertFalse(sc.hasScheduleElapsed(context, dt)),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2000-01-01T19:15:30Z'))),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2000-01-02T19:15:30Z'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2000-01-03T19:15:30Z'))),
  test.assertTrue(sc.hasScheduleElapsed(context, new Date('2000-01-04T19:15:30Z'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2000-01-04T19:16:00Z'))),
  test.assertFalse(sc.hasScheduleElapsed(context, new Date('2000-01-04T19:14:59Z')))
);

// weekly tests
assertions.push(
  // TOOD
);

// monthly tests
assertions.push(
  // TOOD
);

// once tests
assertions.push(
  // TOOD
);

// return
assertions;
