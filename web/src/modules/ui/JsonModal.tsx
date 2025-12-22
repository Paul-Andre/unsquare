"use strict";

import { h } from 'dom-chef';

export interface JsonModalProps {
  jsonString: string;
  message?: string;
  onClose: () => void;
}

/**
 * Creates a modal with a textarea for displaying JSON content.
 * Used as a fallback when clipboard copy fails.
 */
export function createJsonModal(props: JsonModalProps): HTMLDivElement {
  const { jsonString, message = "Copy to clipboard failed. Please copy the JSON manually:", onClose } = props;

  const textarea = (
    <textarea
      value={jsonString}
      readOnly
      style={{
        width: "100%",
        minWidth: "400px",
        minHeight: "300px",
        fontFamily: "monospace",
        fontSize: "12px",
        padding: "10px",
        border: "1px solid var(--border_gray, #c1bbaf)",
        resize: "both",
      }}
    />
  ) as any as HTMLTextAreaElement;

  const container = (
    <div
      id="jsonTextareaContainer"
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--white, white)",
        border: "2px solid var(--border_gray, #c1bbaf)",
        padding: "20px",
        zIndex: 1000,
        maxWidth: "90%",
        maxHeight: "90vh",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      }}
    >
      <p style={{ marginBottom: "10px" }}>{message}</p>
      {textarea}
      <button
        onClick={onClose}
        style={{
          marginTop: "10px",
          padding: "8px 16px",
        }}
      >
        Close
      </button>
    </div>
  ) as any as HTMLDivElement;

  // Select all text in textarea for easy copying after a brief delay
  setTimeout(() => {
    textarea.select();
    textarea.focus();
  }, 0);

  return container;
}

/**
 * Shows the JSON modal by appending it to a parent element.
 * Removes any existing modal first.
 */
export function showJsonModal(parent: HTMLElement, jsonString: string): void {
  // Remove any existing JSON modal
  const existing = parent.querySelector("#jsonTextareaContainer");
  if (existing) {
    existing.remove();
  }

  const modal = createJsonModal({
    jsonString,
    onClose: () => modal.remove(),
  });

  parent.appendChild(modal);
}

