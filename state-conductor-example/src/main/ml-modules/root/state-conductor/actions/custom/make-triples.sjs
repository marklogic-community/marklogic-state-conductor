'use strict';

function performAction(uri, options, context) {
  declareUpdate();
  xdmp.log('performing action "make-triples.sjs"');
  const doc = cts.doc(uri);
  const obj = doc.toObject();

  const uuid = 'http://marklogic/thing/' + sem.uuidString();

  obj.triples = obj.triples || [];
  obj.triples = obj.triples.concat([
    sem.triple(
      sem.iri(uuid),
      sem.iri('http://www.w3.org/2000/01/rdf-schema#type'),
      sem.iri('http://marklogic/thing')
    ),
    sem.triple(
      sem.iri(uuid),
      sem.iri('http://www.w3.org/2000/01/rdf-schema#label'),
      obj.headers.name
    )
  ]);

  xdmp.nodeReplace(doc.root, obj);
  return context;
}

exports.performAction = performAction;
