'use strict';

const TRACE_EVENT = 'state-conductor';

/**
 * Transforms referencePath (JsonPath) expressions to XPath
 *
 * @param {string} path
 * @returns
 */
function referencePathToXpath(path = '$') {
  // replace JsonPath anchors with xpath ones
  return path.replace(/^\$\.?/, '/').replace(/\./g, '/');
}


/**
 * Transforms a reference path expression into a materialized value
 *
 * @param {*} refPath
 * @param {*} [context={}]
 * @returns
 */
function materializeReferencePath(refPath, context = {}) {
  if (!(context instanceof ObjectNode)) {
    context = xdmp.toJSON(context);
  }
  let value = fn.head(context.xpath(referencePathToXpath(refPath)));
  if (value instanceof Document) {
    value = value.root.toObject(); // select the inner object
  } else if (value instanceof ObjectNode) {
    value = value.toObject(); // grab the object type
  } else if (value instanceof Value) {
    value = value.valueOf(); // grab the primative type
  }
  return value;
}

/**
 * Transforms parameters object - including any referencePath expressions
 * into a materialized Object
 *
 * @param {*} [params={}]
 * @param {*} [context={}]
 * @returns
 */
function materializeParameters(params = {}, context = {}) {
  context = xdmp.toJSON(context);
  // find any root params using reference paths
  return Object.keys(params).reduce((acc, key) => {
    // get the key's value
    let value = params[key];
    if (key.endsWith('.$')) {
      // materialize the referencePath params
      key = key.replace(/\.\$$/, ''); // remove the trailing '.$'
      value = materializeReferencePath(value, context);
    }
    // add the key and value to the accumulator
    acc[key] = value;
    return acc;
  }, {});
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
      const upper = start.add('PT1M');
      return start.le(now) && upper.gt(now);
    }
  } catch (ex) {
    xdmp.log(`error parsing schedule values: ${JSON.stringify(context)}`);
  }

  return false;
}

module.exports = {
  hasScheduleElapsed,
  materializeParameters,
  materializeReferencePath,
  referencePathToXpath
};
