import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, X, Bot } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  content: string;
  role: "HumanMessage" | "AIMessage" | "ToolMessage";
  tool_used: any[] | null;
};

const cn = (...classes: (string | boolean | null | undefined)[]) => classes.filter(Boolean).join(" ");

// --- Assistant Modal (controlled) ---

export interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "What is the closest mine to Wollongong?",
  "What spatial data is available for minesites?",
  "How do I write SQL to query mineshaft data?",
  "Explain the 5-tier data classification model.",
];

const getStoredMessages = (): Message[] => {
  try {
    const stored = localStorage.getItem("assistantChat");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export function AssistantModal({ isOpen, onClose }: AssistantModalProps): React.JSX.Element {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [messages, setMessages] = useState<Message[]>(getStoredMessages);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    try {
      localStorage.setItem("assistantChat", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const canSend = input.trim() && !isSending;

  const addMessage = (role: Message["role"], content: string, tool_used: string[] | null = null) => {
    setMessages(m => [...m, { role, content, tool_used }]);
  };

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage) return;

    setInput("");
    addMessage("HumanMessage", userMessage);
    setIsSending(true);

    try {
      const res = await fetch("http://localhost:5174/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, session_id: sessionId, conversation_history: messages }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const responseText = await res.text();
      console.log("Raw response:", responseText);

      // API returns concatenated JSON objects like: {"a":1}{"b":2}
      // Split them and parse individually
      const jsonStrings: string[] = [];
      let currentJson = '';
      let braceCount = 0;

      for (let i = 0; i < responseText.length; i++) {
        const char = responseText[i];
        currentJson += char;

        if (char === '{') braceCount++;
        if (char === '}') braceCount--;

        if (braceCount === 0 && currentJson.trim()) {
          jsonStrings.push(currentJson.trim());
          currentJson = '';
        }
      }

      console.log("Parsed JSON strings:", jsonStrings);
      const parsedMessages = jsonStrings.map(str => JSON.parse(str));
      console.log("Parsed messages:", parsedMessages);

      // Get the LAST AIMessage with actual content (skip empty ones from tool calls)
      const aiMessages = parsedMessages.filter(msg => msg.role === "AIMessage" && msg.content.trim());
      const aiResponse = aiMessages[aiMessages.length - 1];

      if (aiResponse) {
        addMessage("AIMessage", aiResponse.content, aiResponse.tool_used || null);
      } else {
        addMessage("AIMessage", "Sorry, I couldn't process your request.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage("AIMessage", "Sorry, there was an error processing your request. Please try again.");
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="fixed bottom-5.5 right-5.5 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="assistant-modal"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className={cn(
              "w-[92vw] max-w-[420px] h-[70vh] max-h-[640px]",
              "rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-xl",
              "flex flex-col overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-xl">
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-gray-600 dark:text-gray-400" />
                <div className="leading-tight">
                  <div className="font-semibold text-gray-900 dark:text-white">Lucent Bot</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="New chat"
                  onClick={() => setMessages([])}
                  title="New chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close chat"
                  onClick={onClose}
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages or Suggested Prompts */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50 dark:bg-gray-900">
              {messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((m, index) => (
                    <MessageBubble key={index} role={m.role} content={m.content} />
                  ))}
                  {isSending && (
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="rounded-xl rounded-tl-sm px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white text-sm">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      What can I help you with?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ask me about your pipelines, analytics, or troubleshooting
                    </p>
                  </div>
                  <div className="w-full max-w-xs space-y-2">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInput(prompt);
                          inputRef.current?.focus();
                        }}
                        className="block w-full text-center px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t rounded-t-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) void sendMessage();
                      }
                    }}
                    placeholder="Message the assistant…"
                    rows={1}
                    className="flex w-full items-center rounded-lg pl-4 pr-12 py-2 text-sm transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none dark:focus:bg-gray-800 resize-none"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!canSend}
                    className={cn(
                      "absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-500",
                      !canSend && "cursor-not-allowed"
                    )}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Markdown Parser ---

function parseMarkdown(text: string) {
  const elements: React.ReactElement[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={i} className="my-2"><CodeBlock language={language} code={codeLines.join('\n')} /></div>);
      i++;
      continue;
    }

    // Tables
    if (line.includes('|') && line.trim()) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
        if (cells.length) tableRows.push(cells);
        i++;
      }
      elements.push(
        <table key={i} className="w-full border-collapse border border-gray-300 dark:border-gray-600 my-2 text-xs">
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }

    // Bullet points
    if (line.match(/^\s*[-*+]\s/)) {
      const text = line.replace(/^\s*[-*+]\s/, '');
      elements.push(
        <div key={i} className="flex items-start gap-1">
          <span className="text-gray-600 dark:text-gray-400 mt-0.5">•</span>
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Regular text or empty line
    if (line.trim()) {
      elements.push(<div key={i} className="mb-1">{renderInlineMarkdown(line)}</div>);
    } else {
      elements.push(<br key={i} />);
    }
    i++;
  }

  return elements;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(`[^`]*`|\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono border border-gray-200 dark:border-gray-600">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MessageBubble({ role, content }: { role: Message["role"]; content: string }) {
  const isAssistant = role === "AIMessage";
  return (
    <div className={cn("flex gap-2", isAssistant ? "items-start" : "items-start justify-end")}>
      <div
        className={cn(
          "max-w-[85%] px-3 pb-0.5 pt-2 text-sm leading-relaxed",
          isAssistant
            ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl rounded-tl-sm shadow-sm"
            : "bg-gray-800 text-white dark:bg-gray-800 dark:text-white border border-gray-700 dark:border-gray-800 rounded-xl rounded-tr-sm shadow-sm"
        )}
      >
        {parseMarkdown(content)}
      </div>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className="px-2 py-1 text-xs bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm"
          title="Copy code"
        >
          Copy
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDarkMode ? vscDarkPlus : vs}
        customStyle={{
          fontSize: '0.75rem',
          borderRadius: '0.75rem',
          border: isDarkMode ? '1px solid rgb(55, 65, 81)' : '1px solid rgb(229, 231, 235)',
          margin: 0,
          padding: '0.75rem',
          backgroundColor: isDarkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
          boxShadow: isDarkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
        wrapLines={true}
        wrapLongLines={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="inline-flex items-center gap-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1, delay }}
        />
      ))}
    </div>
  );
}
