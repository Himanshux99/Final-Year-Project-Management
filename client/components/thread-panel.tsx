"use client";

import * as React from "react";
import { Send, Link as LinkIcon, Video, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

export interface ThreadMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "student" | "faculty";
  content: string;
  links?: string[];
  createdAt: string;
}

interface ThreadPanelProps {
  title: string;
  messages: ThreadMessage[];
  onSendMessage: (content: string, links?: string[]) => void;
  currentUserRole: "student" | "faculty";
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  maxHeight?: string;
  showHeader?: boolean;
  headerRight?: React.ReactNode;
  pinnedMeetLink?: string;
  onSetMeetLink?: (link: string) => void;
  canSetMeetLink?: boolean;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractLinks(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

export function ThreadPanel({
  title,
  messages,
  onSendMessage,
  currentUserRole,
  placeholder = "Type your message...",
  emptyMessage = "No messages yet. Start the conversation!",
  disabled = false,
  maxHeight = "400px",
  showHeader = true,
  headerRight,
  pinnedMeetLink,
  onSetMeetLink,
  canSetMeetLink = false,
}: ThreadPanelProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [links, setLinks] = React.useState<string[]>([]);
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkInput, setLinkInput] = React.useState("");
  const [showMeetLinkInput, setShowMeetLinkInput] = React.useState(false);
  const [meetLinkInput, setMeetLinkInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() || links.length > 0) {
      // Extract any links from the message content
      const contentLinks = extractLinks(inputValue);
      const allLinks = [...new Set([...links, ...contentLinks])];

      onSendMessage(
        inputValue.trim(),
        allLinks.length > 0 ? allLinks : undefined,
      );
      setInputValue("");
      setLinks([]);
      setShowLinkInput(false);
      setLinkInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addLink = () => {
    if (linkInput.trim() && !links.includes(linkInput.trim())) {
      setLinks([...links, linkInput.trim()]);
      setLinkInput("");
    }
  };

  const removeLink = (link: string) => {
    setLinks(links.filter((l) => l !== link));
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {headerRight}
          </div>
        </>
      )}

      {/* Pinned Google Meet Link */}
      {pinnedMeetLink ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border-b border-teal-200">
          <Video className="h-4 w-4 text-teal-700 shrink-0" />
          <span className="text-sm font-medium text-teal-800">Google Meet</span>
          <a
            href={pinnedMeetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-700 hover:underline truncate flex-1"
          >
            {pinnedMeetLink}
          </a>
          <a
            href={pinnedMeetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Join <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : canSetMeetLink && onSetMeetLink ? (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          {showMeetLinkInput ? (
            <div className="flex gap-2 items-center">
              <Video className="h-4 w-4 text-gray-500 shrink-0" />
              <input
                type="url"
                value={meetLinkInput}
                onChange={(e) => setMeetLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && meetLinkInput.trim()) {
                    onSetMeetLink(meetLinkInput.trim());
                    setMeetLinkInput("");
                    setShowMeetLinkInput(false);
                  }
                }}
                placeholder="Paste Google Meet link..."
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (meetLinkInput.trim()) {
                    onSetMeetLink(meetLinkInput.trim());
                    setMeetLinkInput("");
                    setShowMeetLinkInput(false);
                  }
                }}
              >
                Pin
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowMeetLinkInput(false);
                  setMeetLinkInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowMeetLinkInput(true)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 transition-colors"
            >
              <Video className="h-4 w-4" />
              <span>Add Google Meet Link</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Messages Area */}
      <ScrollArea maxHeight={maxHeight} ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.authorRole === currentUserRole;
              const showDateSeparator =
                index === 0 ||
                new Date(message.createdAt).toDateString() !==
                  new Date(messages[index - 1].createdAt).toDateString();

              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-2 my-4">
                      <Separator className="flex-1" />
                      <span className="text-xs text-gray-400">
                        {new Date(message.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                  )}

                  <div
                    className={`flex gap-3 ${
                      isOwn ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Avatar size="sm">
                      <AvatarFallback
                        variant={
                          message.authorRole === "faculty"
                            ? "faculty"
                            : "student"
                        }
                      >
                        {getInitials(message.authorName)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex flex-col max-w-[75%] ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {message.authorName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>

                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwn
                            ? "bg-primary text-white"
                            : message.authorRole === "faculty"
                              ? "bg-purple-50 text-gray-900 border border-purple-100"
                              : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>

                        {/* Links */}
                        {message.links && message.links.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-opacity-20 space-y-1">
                            {message.links.map((link, i) => (
                              <a
                                key={i}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1 text-xs ${
                                  isOwn
                                    ? "text-white/80 hover:text-white"
                                    : "text-primary hover:underline"
                                }`}
                              >
                                <LinkIcon className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">
                                  {link}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      {!disabled && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          {/* Attached Links */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {links.map((link, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  <LinkIcon className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{link}</span>
                  <button
                    onClick={() => removeLink(link)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Link Input */}
          {showLinkInput && (
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                placeholder="Paste URL and press Enter"
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button size="sm" variant="outline" onClick={addLink}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="min-h-[44px] max-h-32 pr-10 resize-none"
                rows={1}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLinkInput(!showLinkInput)}
                title="Attach link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
