// Stub for Monaco Editor's stackframe dependency.
// Monaco's AMD loader falls back to the page origin when it can't resolve
// a module from CDN paths — this file satisfies that request.
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.StackFrame = factory();
  }
}(this, function() {
  function StackFrame(obj) {
    if (obj) {
      this.setFileName(obj.fileName || obj.filename);
      this.setLineNumber(obj.lineNumber || obj.lineNo);
      this.setColumnNumber(obj.columnNumber || obj.colNo);
      this.setFunctionName(obj.functionName || obj.name);
    }
  }
  StackFrame.prototype = {
    getFileName: function() { return this.fileName; },
    setFileName: function(v) { this.fileName = v; },
    getLineNumber: function() { return this.lineNumber; },
    setLineNumber: function(v) { this.lineNumber = Number(v); },
    getColumnNumber: function() { return this.columnNumber; },
    setColumnNumber: function(v) { this.columnNumber = Number(v); },
    getFunctionName: function() { return this.functionName; },
    setFunctionName: function(v) { this.functionName = v; },
    toString: function() {
      var fn  = this.getFunctionName() || '{anonymous}';
      var loc = '';
      if (this.getFileName()) {
        loc += this.getFileName();
        if (this.getLineNumber()) loc += ':' + this.getLineNumber();
        if (this.getColumnNumber()) loc += ':' + this.getColumnNumber();
      }
      return fn + (loc ? ' (' + loc + ')' : '');
    }
  };
  return StackFrame;
}));
