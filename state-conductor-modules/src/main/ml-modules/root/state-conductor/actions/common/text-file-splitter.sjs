'use strict';

/**
 * Splits a text file and saves the resulting documents to MarkLogic.
 *
 * options.delimiterPattern - string - regular expression for splitting the source document ["\n"]
 * options.skipHeader - boolean - skip the first line of the source document [true]
 * options.skipTrailingEOF - boolean - skip the final empty line of the source document [false]
 * options.targetPrefix - string - directory prefix for the created documents [source document uri]
 * options.targetExtension - string - extension for the created documents ["txt"]
 * options.targetCollections - array - list of collections to apply to the created documents
 *
 * @param {*} uri
 * @param {*} [options={}]
 * @param {*} [context={}]
 * @returns
 */
function performAction(uri, options = {}, context = {}) {
  declareUpdate();

  let delimiterPattern  = options.delimiterPattern || '\n';
  let skipHeader        = !(options.skipHeader === 'false' || options.skipHeader === false);
  let skipTrailingEOF   = options.skipTrailingEOF === 'true' || options.skipTrailingEOF === true;
  let targetPrefix      = options.targetPrefix || uri;
  let targetExtension   = options.targetExtension || 'txt';
  let targetCollections = Array.isArray(options.targetCollections) ? options.targetCollections : [];

  // grab the source document's permissions
  let targetPermissions = xdmp.documentGetPermissions(uri);

  const sourceDoc = cts.doc(uri);

  if (!isTextNode(sourceDoc)) {
    fn.error(null, 'States.TaskFailed', Sequence.from([`Document "${uri}" is not a text node`]));
  }

  const content = fn.string(sourceDoc.root);

  // split the document's content
  let lines = content.split(new RegExp(delimiterPattern));

  // remove the header row
  if (skipHeader) {
    lines = lines.slice(1);
  }

  // remove the trailing EOF
  if (skipTrailingEOF) {
    let last = lines[lines.length - 1];
    if (!last || last.length === 0) {
      lines.pop();
    }
  }

  // create the split documents
  const newDocs = lines.map((line, idx) => {
    let newUri = `${targetPrefix}/${idx}.${targetExtension}`;
    let builder = new NodeBuilder();
    builder.startDocument()
    builder.addText(line);
    builder.endDocument()
    xdmp.documentInsert(newUri, builder.toNode(), {
      collections: targetCollections,
      permissions: targetPermissions
    });
    return newUri;
  });

  context.splits = {
    total: newDocs.length,
    uris: newDocs
  };

  return context;
}

function isTextNode(payload) {
  if (Node.DOCUMENT_NODE === payload.nodeType) {
    payload = payload.root;
  }

  return (('string' === typeof payload) || (Node.TEXT_NODE === payload.nodeType));
}

exports.performAction = performAction;
