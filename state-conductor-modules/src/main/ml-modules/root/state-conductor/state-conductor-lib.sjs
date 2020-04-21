'use strict';

const TRACE_EVENT = 'state-conductor';

/**
 * is used to get the configuration
 * will return a default configuration if there is no configuration.sjs file
 * @returns configuration
 */
function getConfiguration() {
  const defaultconfigurationDefaults = {
    databases: {
      jobs: 'state-conductor-jobs',
      triggers: 'state-conductor-triggers',
      schemas: 'state-conductor-schemas',
    },
    collections: {
      item: 'state-conductor-item',
      job: 'stateConductorJob',
      flow: 'state-conductor-flow',
    },
    URIPrefixes: {
      flow: '/state-conductor-flow/',
      job: '/stateConductorJob/',
    },
  };

  let configuration = {};
  try {
    configuration = require('/state-conductor/configuration.sjs').configuration;
    configuration.foundCustomConfiguration = true;
  } catch {
    configuration.foundCustomConfiguration = false;
  }

  return setDefaultconfiguration(defaultconfigurationDefaults, configuration);
}

/**
 * is used to set the defults on the configuration file
 * incase something was missed
 * @param {*} configuration
 * @returns configuration
 */
function setDefaultconfiguration(defaults, configuration) {
  return Object.assign(defaults, configuration);
}

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
 * Evaluates if the given choice rule is true
 *
 * @param {*} [rule={}]
 * @param {*} [context={}]
 * @returns {boolean} if the rule evaluates to true
 */
function evaluateChoiceRule(rule = {}, context = {}) {
  let compareTo = materializeReferencePath(rule.Variable, context);
  if (rule.And && Array.isArray(rule.And)) {
    // complex array field
    return rule.And.reduce((acc, subrule) => {
      return acc && evaluateChoiceRule(subrule, context);
    }, true);
  } else if (rule.Or && Array.isArray(rule.Or)) {
    // complex array field
    return rule.Or.reduce((acc, subrule) => {
      return acc || evaluateChoiceRule(subrule, context);
    }, false);
  } else if (rule.Not) {
    // complex field
    return !evaluateChoiceRule(rule.Not, context);
  } else if (rule.hasOwnProperty('BooleanEquals')) {
    return !!rule.BooleanEquals === !!compareTo;
  } else if (rule.NumericEquals) {
    return fn.number(rule.NumericEquals) === fn.number(compareTo);
  } else if (rule.NumericGreaterThan) {
    return fn.number(rule.NumericGreaterThan) < fn.number(compareTo);
  } else if (rule.NumericGreaterThanEquals) {
    return fn.number(rule.NumericGreaterThanEquals) <= fn.number(compareTo);
  } else if (rule.NumericLessThan) {
    return fn.number(rule.NumericLessThan) > fn.number(compareTo);
  } else if (rule.NumericLessThanEquals) {
    return fn.number(rule.NumericLessThanEquals) >= fn.number(compareTo);
  } else if (rule.StringEquals) {
    return fn.string(rule.StringEquals) === fn.string(compareTo);
  } else if (rule.StringGreaterThan) {
    return fn.string(rule.StringGreaterThan) < fn.string(compareTo);
  } else if (rule.StringGreaterThanEquals) {
    return fn.string(rule.StringGreaterThanEquals) <= fn.string(compareTo);
  } else if (rule.StringLessThan) {
    return fn.string(rule.StringLessThan) > fn.string(compareTo);
  } else if (rule.StringLessThanEquals) {
    return fn.string(rule.StringLessThanEquals) >= fn.string(compareTo);
  } else if (rule.TimestampEquals) {
    return xs.dateTime(rule.TimestampEquals).eq(xs.dateTime(compareTo));
  } else if (rule.TimestampGreaterThan) {
    return xs.dateTime(compareTo).gt(xs.dateTime(rule.TimestampGreaterThan));
  } else if (rule.TimestampGreaterThanEquals) {
    return xs.dateTime(compareTo).ge(xs.dateTime(rule.TimestampGreaterThanEquals));
  } else if (rule.TimestampLessThan) {
    return xs.dateTime(compareTo).lt(xs.dateTime(rule.TimestampLessThan));
  } else if (rule.TimestampLessThanEquals) {
    return xs.dateTime(compareTo).le(xs.dateTime(rule.TimestampLessThanEquals));
  } else {
    fn.error(
      null,
      'INVALID-STATE-DEFINITION',
      `Unknown choice rule format: "${JSON.stringify(rule)}"`
    );
  }
  return false;
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
      return minutes % context.period === 0;
    } else if ('hourly' === context.value) {
      // checks periodicity and the number of minutes past the hour
      const periodMatch = hours % context.period === 0;
      const m = context.minute;
      return periodMatch && fn.minutesFromDateTime(now) === parseInt(m);
    } else if ('daily' === context.value) {
      // checks periodicity and if we've arrived at the specified time
      const periodMatch = days % context.period === 0;
      const [h, m] = context.startTime.split(':');
      return (
        periodMatch &&
        fn.hoursFromDateTime(now) === parseInt(h) &&
        fn.minutesFromDateTime(now) === parseInt(m)
      );
    } else if ('weekly' === context.value) {
      // checks periodicity and if we've arrived at the specified time and day(s) of the week
      // periodicity check uses the week number for the current year (1-52)
      const periodMatch = xdmp.weekFromDate(now) % context.period === 0;
      const dayMatch = context.days.map((day) => day.toLowerCase()).includes(dayname.toLowerCase());
      const [h, m] = context.startTime.split(':');
      return (
        periodMatch &&
        dayMatch &&
        fn.hoursFromDateTime(now) === parseInt(h) &&
        fn.minutesFromDateTime(now) === parseInt(m)
      );
    } else if ('monthly' === context.value) {
      // checks periodicity and if we've arrived at the specified time and day of the week
      // periodicity check uses the month number for the current year (1-12)
      // day check uses the day number of the month (1 - 31)
      const periodMatch = fn.monthFromDate(now) % context.period === 0;
      const dayMatch = fn.dayFromDateTime(now) === context.monthDay;
      const [h, m] = context.startTime.split(':');
      return (
        periodMatch &&
        dayMatch &&
        fn.hoursFromDateTime(now) === parseInt(h) &&
        fn.minutesFromDateTime(now) === parseInt(m)
      );
    } else if ('once' === context.value) {
      // checks if we've arrived at the specified date and time
      // generates a range of one minute from specified time and validates the current time is within that minute
      const start = xdmp.parseDateTime(
        '[M01]/[D01]/[Y0001]-[H01]:[m01][Z]',
        `${context.startDate}-${context.startTime}Z`
      );
      const upper = start.add('PT1M');
      return start.le(now) && upper.gt(now);
    }
  } catch (ex) {
    fn.error(
      null,
      'INVALID-STATE-DEFINITION',
      `error parsing schedule values: ${JSON.stringify(context)}`
    );
  }

  return false;
}

// checks if its a temporal document and if its latested document
function isLatestTemporalDocument(uri) {
  const temporal = require('/MarkLogic/temporal.xqy');
  const temporalCollections = temporal.collections().toArray();
  const documentCollections = xdmp.documentGetCollections(uri);

  const hasTemporalCollection = temporalCollections.some((collection) => {
    //the temporalCollections are not strings so we need to convert them into strings
    return documentCollections.includes(collection.toString());
  });

  return hasTemporalCollection.length > 0 && documentCollections.includes('latest');
}

module.exports = {
  evaluateChoiceRule,
  getConfiguration,
  hasScheduleElapsed,
  isLatestTemporalDocument,
  materializeParameters,
  materializeReferencePath,
  referencePathToXpath,
  setDefaultconfiguration,
};
