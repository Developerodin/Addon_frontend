'use client';

import ReactMarkdown from 'react-markdown';

/** Lists and bold only. Headings, links, and code unwrap to their text. */
const ALLOWED_MARKDOWN = ['p', 'strong', 'ul', 'ol', 'li'];

type AssistantReplyProps = {
  text: string;
};

/**
 * Renders an assistant reply as markdown. Raw HTML is skipped.
 * @param {AssistantReplyProps} props
 * @returns {JSX.Element}
 */
export default function AssistantReply({ text }: AssistantReplyProps) {
  return (
    <div className="text-sm leading-relaxed [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown allowedElements={ALLOWED_MARKDOWN} skipHtml unwrapDisallowed>
        {text}
      </ReactMarkdown>
    </div>
  );
}
