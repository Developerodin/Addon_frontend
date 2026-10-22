'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Cookies from 'js-cookie';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import AssistantReply from './AssistantReply';

type TextPart = { type: string; text?: string };

/**
 * Bearer token from the accessToken cookie, then localStorage.
 * Same lookup as whmsWarehouseOrderService.
 * @returns {string|null}
 */
function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const token = Cookies.get('accessToken');
    if (token) return token;
    return localStorage.getItem('token');
  } catch (err) {
    console.error('Failed to read access token', err);
    return null;
  }
}

/**
 * Visible text of one UI message.
 * @param {{ parts?: TextPart[] }} message
 * @returns {string}
 */
function textFromMessage(message: { parts?: TextPart[] }): string {
  return (message.parts || [])
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');
}

/**
 * Production assistant. Streams from POST /v1/ai/chat. No sidebar entry.
 * @returns {JSX.Element}
 */
export default function AiAssistantPage() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE_URL}/ai/chat`,
        headers: () => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  /**
   * Sends the current input when a token is present.
   * @param {React.FormEvent<HTMLFormElement>} event
   */
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    if (!getAccessToken()) {
      toast.error('No access token found. Please login again.');
      return;
    }
    sendMessage({ text });
    setInput('');
  };

  return (
    <>
      <Seo title="Production assistant" />
      <div className="main-content !p-[10px]">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <header className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <i className="ri-sparkling-2-line text-xl" aria-hidden />
            </span>
            <div>
              <h1 className="text-base font-bold text-gray-800">Production assistant</h1>
              <p className="text-xs text-gray-500">Ask about a production order. Include the order number.</p>
            </div>
          </header>

          <div
            className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg bg-gray-50 p-3"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Assistant messages"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500">No messages yet.</p>
            ) : (
              messages.map((message) => {
                const mine = message.role === 'user';
                return (
                  <article
                    key={message.id}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      mine ? 'ml-auto bg-indigo-600 text-white' : 'mr-auto border border-gray-200 bg-white text-gray-800'
                    }`}
                  >
                    <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                      {mine ? 'You' : 'Assistant'}
                    </p>
                    {mine ? (
                      <p className="whitespace-pre-wrap">{textFromMessage(message)}</p>
                    ) : (
                      <AssistantReply text={textFromMessage(message)} />
                    )}
                  </article>
                );
              })
            )}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-xs text-red-600">
              {error.message}
            </p>
          ) : null}

          <form className="mt-4 flex gap-2" onSubmit={onSubmit} aria-label="Ask the production assistant">
            <label className="sr-only" htmlFor="ai-assistant-input">
              Message
            </label>
            <input
              id="ai-assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={busy}
              placeholder="Order ORD-000123 ka status?"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50"
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
              aria-label="Send message"
            >
              {busy ? 'Sending' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
