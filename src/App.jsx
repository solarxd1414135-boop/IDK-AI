import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { PenLine, Table2, FileText, MessageCircleQuestion, Loader2, Upload, Send } from "lucide-react";

const TOOLS = [
  { id: "write", label: "Write", icon: PenLine, blurb: "Draft or rewrite text" },
  { id: "data", label: "Data", icon: Table2, blurb: "Ask questions about a CSV" },
  { id: "digest", label: "Digest", icon: FileText, blurb: "Summarize a long text" },
  { id: "ask", label: "Ask", icon: MessageCircleQuestion, blurb: "Q&A over a document" },
];

async function callClaude(prompt, system) {
  // Calls our own serverless function (api/claude.js) instead of Anthropic
  // directly, so the API key never has to live in the browser.
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data.text;
}

function Panel({ children }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #DAD4C3",
        borderRadius: "4px",
        padding: "28px 32px",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          color: "#5B5748",
          marginBottom: "6px",
          fontFamily: "'Georgia', serif",
          fontStyle: "italic",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #DAD4C3",
  borderRadius: "3px",
  padding: "10px 12px",
  fontSize: "14px",
  fontFamily: "inherit",
  background: "#FBFAF6",
  color: "#24291F",
  resize: "vertical",
};

function RunButton({ onClick, loading, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: disabled || loading ? "#B8A48F" : "#7A4A2A",
        color: "#FBF8F2",
        border: "none",
        borderRadius: "3px",
        padding: "10px 20px",
        fontSize: "14px",
        fontFamily: "inherit",
        cursor: disabled || loading ? "default" : "pointer",
      }}
    >
      {loading && <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} />}
      {children}
    </button>
  );
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <p style={{ color: "#8C3B2E", fontSize: "13px", marginTop: "12px" }}>{msg}</p>
  );
}

function ResultBlock({ text }) {
  if (!text) return null;
  return (
    <div
      style={{
        marginTop: "22px",
        paddingTop: "20px",
        borderTop: "1px solid #DAD4C3",
        fontSize: "14.5px",
        lineHeight: 1.65,
        color: "#24291F",
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
}

function WriteTool() {
  const [task, setTask] = useState("");
  const [style, setStyle] = useState("Clear and professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    if (!task.trim()) {
      setError("Describe what you want written first.");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    try {
      const prompt = `Tone/style: ${style}\n\nTask: ${task}\n\nWrite the requested text directly, with no preamble.`;
      const out = await callClaude(prompt, "You are a skilled writing assistant. Produce polished, ready-to-use text.");
      setResult(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <Field label="What do you need written or rewritten?">
        <textarea
          rows={5}
          style={inputStyle}
          placeholder="Paste a draft to improve, or describe what to write (e.g. a follow-up email declining a meeting)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        />
      </Field>
      <Field label="Style">
        <select style={inputStyle} value={style} onChange={(e) => setStyle(e.target.value)}>
          <option>Clear and professional</option>
          <option>Warm and conversational</option>
          <option>Concise and direct</option>
          <option>Persuasive</option>
          <option>Academic</option>
          <option>Playful</option>
        </select>
      </Field>
      <RunButton onClick={run} loading={loading} disabled={loading}>
        Generate
      </RunButton>
      <ErrorNote msg={error} />
      <ResultBlock text={result} />
    </Panel>
  );
}

function DataTool() {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        setError("");
      },
      error: (err) => setError("Could not read that file: " + err.message),
    });
  };

  const run = async () => {
    if (!rows) {
      setError("Upload a CSV file first.");
      return;
    }
    if (!question.trim()) {
      setError("Ask a question about the data.");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    try {
      const columns = Object.keys(rows[0] || {});
      const sample = rows.slice(0, 40);
      const prompt = `Here is a CSV dataset with columns: ${columns.join(", ")}.\nTotal rows: ${rows.length}. A sample of up to 40 rows (JSON):\n${JSON.stringify(sample)}\n\nQuestion: ${question}\n\nAnswer using the data. If the sample doesn't fully cover the answer, say what you can determine and what would need the full dataset.`;
      const out = await callClaude(prompt, "You are a careful data analyst. Be precise and note any uncertainty.");
      setResult(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <Field label="CSV file">
        <div
          onClick={() => fileRef.current.click()}
          style={{
            border: "1px dashed #B8A48F",
            borderRadius: "3px",
            padding: "18px",
            textAlign: "center",
            cursor: "pointer",
            color: "#5B5748",
            fontSize: "13.5px",
            background: "#FBFAF6",
          }}
        >
          <Upload size={16} style={{ marginBottom: "4px" }} />
          <div>{fileName ? fileName : "Click to choose a .csv file"}</div>
          {rows && <div style={{ marginTop: "4px", color: "#4F6B4C" }}>{rows.length} rows loaded</div>}
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
      </Field>
      <Field label="Your question">
        <input
          style={inputStyle}
          placeholder="e.g. Which region had the highest average sales?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </Field>
      <RunButton onClick={run} loading={loading} disabled={loading}>
        Analyze
      </RunButton>
      <ErrorNote msg={error} />
      <ResultBlock text={result} />
    </Panel>
  );
}

function DigestTool() {
  const [text, setText] = useState("");
  const [length, setLength] = useState("A few key bullet points");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    if (!text.trim()) {
      setError("Paste in some text to summarize.");
      return;
    }
    setError("");
    setLoading(true);
    setResult("");
    try {
      const prompt = `Summarize the following text. Format: ${length}.\n\nText:\n${text}`;
      const out = await callClaude(prompt, "You write clear, accurate summaries that preserve the important details and drop the rest.");
      setResult(out);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <Field label="Text to summarize">
        <textarea
          rows={8}
          style={inputStyle}
          placeholder="Paste an article, report, or set of notes"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Field label="Format">
        <select style={inputStyle} value={length} onChange={(e) => setLength(e.target.value)}>
          <option>A few key bullet points</option>
          <option>One paragraph</option>
          <option>A single sentence</option>
          <option>Detailed section-by-section summary</option>
        </select>
      </Field>
      <RunButton onClick={run} loading={loading} disabled={loading}>
        Summarize
      </RunButton>
      <ErrorNote msg={error} />
      <ResultBlock text={result} />
    </Panel>
  );
}

function AskTool() {
  const [doc, setDoc] = useState("");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!doc.trim()) {
      setError("Paste in the document text first.");
      return;
    }
    if (!question.trim()) {
      setError("Type a question.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const prompt = `Document:\n${doc}\n\nQuestion: ${question}\n\nAnswer using only information from the document. If the document doesn't contain the answer, say so.`;
      const out = await callClaude(prompt, "You answer questions strictly based on the provided document.");
      setHistory((h) => [...h, { q: question, a: out }]);
      setQuestion("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <Field label="Document text">
        <textarea
          rows={6}
          style={inputStyle}
          placeholder="Paste the document or notes you want to ask questions about"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
        />
      </Field>
      <Field label="Ask a question">
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="What does this document say about...?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <RunButton onClick={run} loading={loading} disabled={loading}>
            <Send size={14} />
          </RunButton>
        </div>
      </Field>
      <ErrorNote msg={error} />
      {history.length > 0 && (
        <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {history.map((turn, i) => (
            <div key={i} style={{ borderTop: "1px solid #DAD4C3", paddingTop: "14px" }}>
              <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px", color: "#4F6B4C" }}>{turn.q}</p>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{turn.a}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function AIToolkit() {
  const [active, setActive] = useState("write");

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#F3F0E7",
        minHeight: "600px",
        padding: "40px 24px",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "'Georgia', serif",
            fontWeight: 400,
            fontSize: "30px",
            color: "#24291F",
            margin: "0 0 6px",
          }}
        >
          The Toolkit
        </h1>
        <p style={{ fontSize: "14px", color: "#5B5748", margin: "0 0 28px" }}>
          Four small tools, one page: write, analyze data, summarize, and ask questions of a document.
        </p>

        <div style={{ display: "flex", gap: "6px", marginBottom: "-1px", flexWrap: "wrap" }}>
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  border: "1px solid #DAD4C3",
                  borderBottom: isActive ? "1px solid #FFFFFF" : "1px solid #DAD4C3",
                  borderTopLeftRadius: "4px",
                  borderTopRightRadius: "4px",
                  background: isActive ? "#FFFFFF" : "transparent",
                  color: isActive ? "#7A4A2A" : "#5B5748",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: isActive ? 2 : 1,
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {active === "write" && <WriteTool />}
        {active === "data" && <DataTool />}
        {active === "digest" && <DigestTool />}
        {active === "ask" && <AskTool />}
      </div>
    </div>
  );
}
