"use client";

import ReactMarkdown from "react-markdown";

export default function SummaryRenderer({ content }: { content: string }) {
  return (
    <div className="summary-content">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="relative text-3xl sm:text-4xl font-bold mt-2 mb-6 first:mt-0 leading-tight">
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {children}
              </span>
              <span className="block mt-3 h-px w-24 bg-gradient-to-r from-violet-500 via-blue-500 to-transparent" />
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="relative flex items-center gap-3 text-2xl font-bold mt-10 mb-4 first:mt-0 text-white leading-tight">
              <span className="block w-1 h-7 rounded-full bg-gradient-to-b from-violet-400 to-blue-500 shadow-lg shadow-violet-500/50" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="relative text-xl font-semibold mt-8 mb-3 first:mt-0 text-violet-200 leading-snug">
              <span className="text-violet-400/60 mr-2 font-mono">#</span>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mt-6 mb-2 text-blue-200">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-300 leading-[1.85] mb-5 text-[15px]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-2.5 mb-6 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2.5 mb-6 ml-1 counter-reset-list">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            const isOrdered = (props as { ordered?: boolean }).ordered;
            return (
              <li className="relative pl-7 text-gray-300 leading-[1.75] text-[15px] group">
                <span
                  className={`absolute left-0 top-[0.6em] ${
                    isOrdered
                      ? "w-5 h-5 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-violet-500/30"
                      : "w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-blue-400 shadow-sm shadow-violet-500/50 group-hover:scale-150 transition-transform"
                  }`}
                />
                {children}
              </li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-white bg-gradient-to-r from-violet-400/10 to-blue-400/10 px-1 rounded">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-violet-300">{children}</em>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/40 hover:decoration-blue-300 transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className={`${className} text-sm`}>{children}</code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 mx-0.5 text-[13px] font-mono rounded-md bg-violet-500/10 text-violet-200 border border-violet-500/20">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-6 p-5 rounded-xl bg-black/40 border border-white/[0.06] overflow-x-auto text-[13px] leading-relaxed text-gray-200 backdrop-blur-sm">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="relative my-6 pl-6 pr-4 py-3 border-l-4 border-violet-500 bg-gradient-to-r from-violet-500/10 to-transparent rounded-r-lg italic text-gray-300">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-b border-white/[0.08]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-gray-300 border-t border-white/[0.04]">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
