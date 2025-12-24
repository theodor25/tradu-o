
export const PROGRAMMING_KEYWORDS: Record<string, string[]> = {
  python: ['def', 'class', 'import', 'from', '__init__', 'self', 'lambda', 'yield', 'async', 'await', 'with', 'as', 'try', 'except', 'finally', 'raise', 'assert', 'pass', 'return', 'break', 'continue', 'if', 'elif', 'else', 'for', 'while', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None', 'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool'],
  javascript: ['function', 'const', 'let', 'var', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'promise', 'then', 'catch', 'finally', 'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'break', 'continue', 'return', 'new', 'this', 'typeof', 'instanceof', 'delete', 'void', 'yield', 'true', 'false', 'null', 'undefined', 'console', 'log', 'require', 'module', 'exports', 'prototype', 'constructor'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'abstract', 'final', 'static', 'synchronized', 'volatile', 'transient', 'native', 'strictfp', 'package', 'import', 'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'this', 'super', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'true', 'false', 'null'],
  sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'CHECK', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'],
  common_terms: ['API', 'HTTP', 'HTTPS', 'GET', 'POST', 'PUT', 'DELETE', 'REST', 'JSON', 'XML', 'HTML', 'CSS', 'URL', 'URI', 'CRUD', 'MVC', 'OOP', 'async', 'sync', 'callback', 'promise', 'array', 'object', 'string', 'integer', 'boolean', 'float', 'double', 'char', 'byte', 'null', 'undefined', 'void', 'true', 'false', 'debug', 'error', 'exception', 'stack', 'heap', 'queue', 'tree', 'hash', 'algorithm', 'complexity', 'O(n)', 'O(1)', 'O(log n)']
};

export const ALL_KEYWORDS = Array.from(new Set(Object.values(PROGRAMMING_KEYWORDS).flat()));

export const APP_CONFIG = {
  MAX_FILE_SIZE_MB: 20,
  CHUNK_SIZE: 3500, // Gemini context chunk size
  GEMINI_MODEL: 'gemini-3-flash-preview',
};
