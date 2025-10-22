import React, { useState, useRef, useEffect } from 'react';
import { Play, Copy } from 'lucide-react';
import Header from '../components/navigation/Header';
import { SQLEditorResults } from '../components/modals/SQLEditorResults';



// SQL Syntax highlighting
interface Token {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'function' | 'identifier' | 'punctuation' | 'whitespace';
  value: string;
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT',
  'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT', 'IDENTITY', 'SEQUENCE', 'TRIGGER',
  'PROCEDURE', 'FUNCTION', 'BEGIN', 'END', 'IF', 'ELSE', 'ELSEIF', 'CASE', 'WHEN', 'THEN', 'WHILE', 'FOR', 'LOOP',
  'RETURN', 'DECLARE', 'CURSOR', 'OPEN', 'FETCH', 'CLOSE', 'DEALLOCATE', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
  'SAVEPOINT', 'GRANT', 'REVOKE', 'DENY', 'USER', 'ROLE', 'PERMISSION', 'SCHEMA', 'COLLATE', 'CHARSET', 'ENGINE',
  'PARTITION', 'SUBPARTITION', 'RANGE', 'LIST', 'HASH', 'KEY', 'COLUMNS', 'ALGORITHM', 'LOCK', 'TEMPORARY', 'TEMP',
  'GLOBAL', 'LOCAL', 'SESSION', 'SYSTEM', 'ADMIN', 'USAGE', 'EXECUTE', 'REFERENCES', 'TRIGGER', 'EVENT', 'ROUTINE',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'TOP', 'FIRST', 'SKIP', 'TIES',
  'WITH', 'RECURSIVE', 'CTE', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
  'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'PERCENT_RANK', 'CUME_DIST', 'PERCENTILE_CONT', 'PERCENTILE_DISC'
]);

const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE', 'MEDIAN', 'MODE', 'COALESCE', 'ISNULL', 'NULLIF',
  'CAST', 'CONVERT', 'TRY_CAST', 'TRY_CONVERT', 'PARSE', 'TRY_PARSE', 'FORMAT', 'CONCAT', 'SUBSTRING', 'LEFT',
  'RIGHT', 'LEN', 'LENGTH', 'TRIM', 'LTRIM', 'RTRIM', 'UPPER', 'LOWER', 'REPLACE', 'STUFF', 'REVERSE', 'CHARINDEX',
  'PATINDEX', 'SOUNDEX', 'DIFFERENCE', 'QUOTENAME', 'STR', 'SPACE', 'REPLICATE', 'CHAR', 'ASCII', 'UNICODE',
  'NCHAR', 'GETDATE', 'GETUTCDATE', 'SYSDATETIME', 'SYSUTCDATETIME', 'SYSDATETIMEOFFSET', 'CURRENT_TIMESTAMP',
  'DATEADD', 'DATEDIFF', 'DATENAME', 'DATEPART', 'DAY', 'MONTH', 'YEAR', 'DATETRUNC', 'EOMONTH', 'DATEFROMPARTS',
  'DATETIME2FROMPARTS', 'DATETIMEFROMPARTS', 'DATETIMEOFFSETFROMPARTS', 'SMALLDATETIMEFROMPARTS', 'TIMEFROMPARTS',
  'ABS', 'CEILING', 'FLOOR', 'ROUND', 'SQRT', 'SQUARE', 'POWER', 'EXP', 'LOG', 'LOG10', 'SIN', 'COS', 'TAN',
  'ASIN', 'ACOS', 'ATAN', 'ATN2', 'DEGREES', 'RADIANS', 'PI', 'RAND', 'SIGN', 'NEWID', 'NEWSEQUENTIALID'
]);

const tokenizeSQL = (sql: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    // Whitespace
    if (/\s/.test(char)) {
      let whitespace = '';
      while (i < sql.length && /\s/.test(sql[i])) {
        whitespace += sql[i];
        i++;
      }
      tokens.push({ type: 'whitespace', value: whitespace });
      continue;
    }

    // Single line comments
    if (char === '-' && sql[i + 1] === '-') {
      let comment = '';
      while (i < sql.length && sql[i] !== '\n') {
        comment += sql[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Multi-line comments
    if (char === '/' && sql[i + 1] === '*') {
      let comment = '';
      comment += sql[i] + sql[i + 1];
      i += 2;
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) {
        comment += sql[i];
        i++;
      }
      if (i < sql.length - 1) {
        comment += sql[i] + sql[i + 1];
        i += 2;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // String literals
    if (char === "'" || char === '"') {
      const quote = char;
      let string = quote;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          string += sql[i];
          i++;
          if (i < sql.length && sql[i] === quote) {
            // Escaped quote
            string += sql[i];
            i++;
          } else {
            break;
          }
        } else {
          string += sql[i];
          i++;
        }
      }
      tokens.push({ type: 'string', value: string });
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(sql[i + 1]))) {
      let number = '';
      while (i < sql.length && (/[\d.]/.test(sql[i]) || (sql[i].toLowerCase() === 'e' && /[+-]?\d/.test(sql[i + 1])))) {
        number += sql[i];
        i++;
        if (sql[i - 1].toLowerCase() === 'e' && /[+-]/.test(sql[i])) {
          number += sql[i];
          i++;
        }
      }
      tokens.push({ type: 'number', value: number });
      continue;
    }

    // Operators and punctuation
    if (/[+\-*/%=<>!&|^~()[\]{},;.]/.test(char)) {
      let operator = char;
      i++;
      
      // Handle multi-character operators
      if (i < sql.length) {
        const twoChar = operator + sql[i];
        if (['<=', '>=', '<>', '!=', '||', '&&', '::'].includes(twoChar)) {
          operator = twoChar;
          i++;
        }
      }
      
      tokens.push({ 
        type: /[+\-*/%=<>!&|^~]/.test(operator[0]) ? 'operator' : 'punctuation', 
        value: operator 
      });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      let identifier = '';
      while (i < sql.length && /[a-zA-Z0-9_]/.test(sql[i])) {
        identifier += sql[i];
        i++;
      }
      
      const upperIdentifier = identifier.toUpperCase();
      let tokenType: Token['type'] = 'identifier';
      
      if (SQL_KEYWORDS.has(upperIdentifier)) {
        tokenType = 'keyword';
      } else if (SQL_FUNCTIONS.has(upperIdentifier)) {
        tokenType = 'function';
      }
      
      tokens.push({ type: tokenType, value: identifier });
      continue;
    }

    // Default: single character
    tokens.push({ type: 'identifier', value: char });
    i++;
  }

  return tokens;
};

const renderHighlightedSQL = (sql: string, ref?: React.RefObject<HTMLDivElement>): React.ReactElement => {
  const tokens = tokenizeSQL(sql);
  
  return (
    <div 
      ref={ref}
      className="absolute inset-0 p-4 pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap break-words overflow-hidden"
         style={{ 
           fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Menlo, 'Ubuntu Mono', monospace",
           fontWeight: '400',
           letterSpacing: '0.025em'
         }}>
      {tokens.map((token, index) => {
        let className = '';
        switch (token.type) {
          case 'keyword':
            className = 'text-blue-600 dark:text-blue-400 font-semibold';
            break;
          case 'function':
            className = 'text-purple-600 dark:text-purple-400 font-medium';
            break;
          case 'string':
            className = 'text-green-600 dark:text-green-400';
            break;
          case 'comment':
            className = 'text-gray-500 dark:text-gray-400 italic';
            break;
          case 'number':
            className = 'text-orange-600 dark:text-orange-400';
            break;
          case 'operator':
            className = 'text-red-600 dark:text-red-400 font-medium';
            break;
          case 'punctuation':
            className = 'text-gray-700 dark:text-gray-300';
            break;
          default:
            className = 'text-gray-900 dark:text-gray-100';
        }
        
        return (
          <span key={index} className={className}>
            {token.value}
          </span>
        );
      })}
    </div>
  );
};


export default function EnterpriseSQLEditor(): React.ReactElement {
  // Load SQL from localStorage on component mount
  const [sql, setSql] = useState<string>(() => {
    const savedSQL = localStorage.getItem('sql-editor-query');
    return savedSQL || `-- Mine Data Query - Comprehensive mine analysis
-- Query combines all key mine data from data_clean schema

SELECT 
    di.primary_name,
    di.alternate_name,
    dl.country,
    dl.state,
    dl.district,
    ds.latitude,
    ds.longitude,
    dst.status,
    dst.closure_year,
    dc.company_name,
    COUNT(sh.shaft_id) as total_shafts,
    AVG(sh.shaft_depth) as avg_shaft_depth,
    MAX(sh.shaft_depth) as max_shaft_depth,
    de.grid_connection,
    STRING_AGG(DISTINCT fc.commodity, ', ') as commodities
FROM data_clean.dim_spatial ds
JOIN data_clean.dim_identification di ON ds.mine_id = di.mine_id
LEFT JOIN data_clean.dim_locations dl ON ds.mine_id = dl.mine_id
LEFT JOIN data_clean.dim_status dst ON ds.mine_id = dst.mine_id
LEFT JOIN data_clean.dim_company dc ON ds.mine_id = dc.mine_id
LEFT JOIN data_clean.fact_shafts sh ON ds.mine_id = sh.mine_id
LEFT JOIN data_clean.dim_energy de ON ds.mine_id = de.mine_id
LEFT JOIN data_clean.fact_commodities fc ON ds.mine_id = fc.mine_id
WHERE dl.country = 'Australia'
AND dst.status IN ('closed', 'abandoned')
GROUP BY 
    di.primary_name, di.alternate_name, dl.country, dl.state, dl.district,
    ds.latitude, ds.longitude, dst.status, dst.closure_year, dc.company_name, de.grid_connection
ORDER BY MAX(sh.shaft_depth) DESC NULLS LAST`;
  });

  const [selectedText, setSelectedText] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 });
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isResultsPanelExpanded, setIsResultsPanelExpanded] = useState<boolean>(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [rowCount, setRowCount] = useState<number | undefined>(undefined);
  const [totalRows, setTotalRows] = useState<number | undefined>(undefined);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const syntaxHighlightRef = useRef<HTMLDivElement>(null);

  const refreshEditor = () => {
    // Clear results and reset state
    setQueryResults(null);
    setQueryError(null);
    setExecutionTime(undefined);
    setRowCount(undefined);
    setTotalRows(undefined);
    setCurrentOffset(0);
    setCurrentQuery('');
    setIsResultsPanelExpanded(false);
    setSelectedText('');
    setSelectedLines(null);
    // Focus back to the editor
    textareaRef.current?.focus();
  };

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = sql.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorPosition({ line, column });
  };

  const handleScroll = () => {
    if (!textareaRef.current) return;
    
    const scrollTop = textareaRef.current.scrollTop;
    const scrollLeft = textareaRef.current.scrollLeft;
    
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
    
    if (syntaxHighlightRef.current) {
      syntaxHighlightRef.current.scrollTop = scrollTop;
      syntaxHighlightRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    setSelectedText(sql.substring(start, end));
    
    // Calculate selected line numbers
    if (start !== end) {
      const textBeforeStart = sql.substring(0, start);
      const textBeforeEnd = sql.substring(0, end);
      
      const startLine = textBeforeStart.split('\n').length;
      const endLine = textBeforeEnd.split('\n').length;
      
      setSelectedLines({ start: startLine, end: endLine });
    } else {
      setSelectedLines(null);
    }
    
    updateCursorPosition();
  };

  const executeQuery = async (isLoadMore: boolean = false) => {
    const queryToExecute = selectedText.trim() || sql.trim();
    if (!queryToExecute) return;

    if (isLoadMore) {
      setIsLoadingMore(true);
      if (!currentQuery) {
        setIsLoadingMore(false);
        return;
      }
    } else {
      setIsExecuting(true);
      setCurrentQuery(queryToExecute);
      setCurrentOffset(0);
    }
    
    const startTime = Date.now();
    const offset = isLoadMore ? currentOffset : 0;
    const sqlToExecute = isLoadMore ? currentQuery : queryToExecute;
    
    try {
      const response = await fetch('/api/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sql: sqlToExecute,
          limit: 100,
          offset: offset
        }),
      });

      const responseData = await response.json();
      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        setQueryResults(null);
        setQueryError(responseData.message || 'Unknown error occurred');
        setExecutionTime(executionTime);
        setRowCount(0);
        setTotalRows(0);
        setIsResultsPanelExpanded(true);
        return;
      }

      // Transform API response to QueryResult format
      const apiResult = responseData;
      
      if (apiResult.query_type === 'SELECT' && apiResult.data) {
        // SELECT query - show the raw data
        if (isLoadMore && queryResults) {
          // Append new results to existing results
          setQueryResults([...queryResults, ...apiResult.data]);
          setCurrentOffset(currentOffset + apiResult.returned_rows);
        } else {
          // New query - replace results
          setQueryResults(apiResult.data);
          setCurrentOffset(apiResult.returned_rows);
        }
        setQueryError(null);
        setExecutionTime(executionTime);
        setRowCount(isLoadMore ? (rowCount || 0) + apiResult.returned_rows : apiResult.returned_rows);
        setTotalRows(apiResult.total_rows);
      } else {
        // INSERT/UPDATE/DELETE query or view definition update
        let resultMessage;
        if (apiResult.rows_affected === -1) {
          resultMessage = "View Definition Updated";
        } else {
          resultMessage = `${apiResult.rows_affected} row(s) affected`;
        }

        setQueryResults([{ Result: resultMessage }]);
        setQueryError(null);
        setExecutionTime(executionTime);
        setRowCount(apiResult.rows_affected === -1 ? 0 : apiResult.rows_affected || 0);
        setTotalRows(apiResult.rows_affected === -1 ? 0 : apiResult.rows_affected || 0);
      }
      
      setIsResultsPanelExpanded(true);
    } catch (error) {
      setQueryResults(null);
      setQueryError(error instanceof Error ? error.message : 'Network error occurred');
      setExecutionTime(Date.now() - startTime);
      setRowCount(0);
      setTotalRows(0);
      setIsResultsPanelExpanded(true);
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsExecuting(false);
      }
    }
  };

  const loadMoreResults = () => {
    executeQuery(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    } else if (e.key === 'F5') {
      e.preventDefault();
      executeQuery();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      textareaRef.current?.select();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleComment();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      if (!textareaRef.current) return;
      
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const value = textareaRef.current.value;
      
      // Insert 4 spaces at cursor position
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      setSql(newValue);
      
      // Move cursor to after the inserted spaces
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const toggleComment = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const lines = sql.split('\n');
    
    let lineStart = 0;
    let startLineIndex = 0;
    let endLineIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = lineStart + lines[i].length;
      if (start >= lineStart && start <= lineEnd && startLineIndex === 0) {
        startLineIndex = i;
      }
      if (end >= lineStart && end <= lineEnd) {
        endLineIndex = i;
        break;
      }
      lineStart = lineEnd + 1;
    }
    
    const newLines = lines.map((line, index) => {
      if (index >= startLineIndex && index <= endLineIndex) {
        if (line.trim().startsWith('--')) {
          return line.replace(/^(\s*)--\s?/, '$1');
        } else {
          return line.replace(/^(\s*)/, '$1-- ');
        }
      }
      return line;
    });
    
    setSql(newLines.join('\n'));
  };

  const totalLines = sql.split('\n').length;
  const lineNumberWidth = Math.max(50, String(totalLines).length * 8 + 20);

  useEffect(() => {
    updateCursorPosition();
  }, [sql]);

  // Save SQL to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sql-editor-query', sql);
  }, [sql]);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header with navigation and action buttons */}
      <Header
        title="SQL Editor"
        description="Advanced SQL query editor with unlimited lines and professional features"
        showRefresh={true}
        onRefresh={refreshEditor}
        showPanelBottom={true}
        isPanelBottomExpanded={isResultsPanelExpanded}
        onTogglePanelBottom={() => setIsResultsPanelExpanded(!isResultsPanelExpanded)}
        actions={[
          <button
            key="execute"
            onClick={() => executeQuery()}
            disabled={isExecuting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
            title="Execute Query (Ctrl+Enter)"
          >
            <Play size={16} className={isExecuting ? 'animate-pulse' : ''} />
          </button>,
          
          <button
            key="copy"
            onClick={() => navigator.clipboard.writeText(selectedText || sql)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title={selectedText ? "Copy Selection" : "Copy All"}
          >
            <Copy size={16} />
          </button>
        ]}
      />

      {/* Main editor area - takes full height with padding bottom */}
      <div className="flex-1 pb-6">
        <div className="px-6 h-full">
          <div className="h-full rounded-lg border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] flex flex-col">
            {/* Header status bar */}
            <div className="h-8 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-end px-4 text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
              <div className="flex items-center gap-6">
                {selectedLines && (
                  <span>
                    {selectedLines.start === selectedLines.end 
                      ? `Line ${selectedLines.start} selected`
                      : `Lines ${selectedLines.start}-${selectedLines.end} selected`
                    }
                  </span>
                )}
                <span>Line {cursorPosition.line}, Column {cursorPosition.column}</span>
                <span>{totalLines} lines</span>
                <span>{sql.length} characters</span>
              </div>
            </div>
            
            <div className="flex-1 flex">
              <div 
                ref={lineNumbersRef}
                className="bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-600 overflow-hidden flex-shrink-0 select-none"
                style={{ width: `${lineNumberWidth}px` }}
              >
                <div className="text-xs leading-6 text-right text-gray-400 dark:text-gray-500 p-4"
                     style={{ 
                       fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Menlo, 'Ubuntu Mono', monospace",
                       fontWeight: '400',
                       letterSpacing: '0.025em'
                     }}>
                  {Array.from({ length: totalLines }, (_, i) => (
                    <div key={i + 1} className="h-6">{i + 1}</div>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 relative">
                {/* Syntax highlighting overlay */}
                {renderHighlightedSQL(sql, syntaxHighlightRef)}
                
                <textarea
                  ref={textareaRef}
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  onSelect={handleSelection}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  onMouseUp={handleSelection}
                  onKeyUp={handleSelection}
                  placeholder="-- Enter your SQL query here..."
                  className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent resize-none focus:outline-none text-sm leading-6 overflow-auto whitespace-pre-wrap break-words border-none focus:ring-0 caret-gray-900 dark:caret-gray-100"
                  style={{ 
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', Menlo, 'Ubuntu Mono', monospace",
                    fontWeight: '400',
                    letterSpacing: '0.025em'
                  }}
                  spellCheck={false}
                  wrap="soft"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* SQL Editor Results Panel */}
      <SQLEditorResults
        isOpen={isResultsPanelExpanded}
        onClose={() => setIsResultsPanelExpanded(false)}
        queryResults={queryResults}
        queryError={queryError}
        isLoading={isExecuting}
        executionTime={executionTime}
        rowCount={rowCount}
        totalRows={totalRows}
        onLoadMore={loadMoreResults}
        isLoadingMore={isLoadingMore}
        canLoadMore={(totalRows || 0) > (rowCount || 0)}
      />
    </div>
  );
}