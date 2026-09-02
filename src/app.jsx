import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  PenLine,
  Table2,
  FileText,
  MessageCircleQuestion,
  Languages,
  ImageIcon,
  Loader2,
  Upload,
  Send,
} from "lucide-react";

const TOOLS = [
  { id: "write", label: "Write", icon: PenLine },
  { id: "data", label: "Data", icon: Table2 },
  { id: "digest", label: "Digest", icon: FileText },
  { id: "ask", label: "Ask", icon: MessageCircleQuestion },
  { id: "translate", label: "Translate", icon: Languages },
  { id: "image", label: "Image", icon: ImageIcon },
];

const bg = "#12140F";
const panel = "#1B1E17";
const ink = "#ECE7D8";
const inkDim = "#A6A08D";
const line = "#2D3126";
const gold = "#D9A54A";
const teal = "#5A9C90";

async function callClaude(prompt, system) {
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
        background: panel,
        border: `1px solid ${line}`,
        borderRadius: "6px",
        padding: "30px 34px",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          color: gold,
          marginBottom: "8px",
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
  border: `1px solid ${line}`,
  borderRadius: "4px",
  padding: "11px 13px",
  fontSize: "14px",
  fontFamily: "inherit",
  background: "#0F110C",
  color: ink,
  resize: "vertical",
  outline: "none",
};

function RunButton({ onClick, loading, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "9px",
        background: disabled || loading ? "#5A5A4E" : gold,
        color: "#181A13",
        border: "none",
        borderRadius: "4px",
        padding: "11px 22px",
        fontSize: "14px",
        fontWeight: 600,
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
  return <p style={{ color: "#E08B72", fontSize: "13px", marginTop: "14px" }}>{msg}</p>;
}

function ResultBlock({ text }) {
  if (!text) return null;
  return (
    <div
      style={{
        marginTop: "24px",
        paddingTop: "22px",
        borderTop: `1px solid ${line}`,
        fontSize: "14.5px",
        lineHeight: 1.7,
        color: ink,
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
    if (!task.trim()) return setError("Describe what you want written first.");
    setError("");
    setLoading(true);
    setResult("");
    try {
      const prompt = `Tone/style: ${style}\n\nTask: ${task}\n\nWrite the requested text directly, with no preamble.`;
      setResult(await callClaude(prompt, "You are a skilled writing assistant. Produce polished, ready-to-use text."));
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
          placeholder="Paste a draft to improve, or describe what to write"
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
    if (!rows) return setError("Upload a CSV file first.");
    if (!question.trim()) return setError("Ask a question about the data.");
    setError("");
    setLoading(true);
    setResult("");
    try {
      const columns = Object.keys(rows[0] || {});
      const sample = rows.slice(0, 40);
      const prompt = `Dataset columns: ${columns.join(", ")}.\nTotal rows: ${rows.length}. Sample (JSON):\n${JSON.stringify(
        sample
      )}\n\nQuestion: ${question}\n\nAnswer using the data.`;
      setResult(await callClaude(prompt, "You are a careful data analyst. Be precise and note any uncertainty."));
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
            border: `1px dashed ${line}`,
            borderRadius: "4px",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            color: inkDim,
            fontSize: "13.5px",
            background: "#0F110C",
          }}
        >
          <Upload size={16} style={{ marginBottom: "5px" }} />
          <div>{fileName ? fileName : "Click to choose a .csv file"}</div>
          {rows && <div style={{ marginTop: "5px", color: teal }}>{rows.length} rows loaded</div>}
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
    if (!text.trim()) return setError("Paste in some text to summarize.");
    setError("");
    setLoading(true);
    setResult("");
    try {
      const prompt = `Summarize the following text. Format: ${length}.\n\nText:\n${text}`;
      setResult(await callClaude(prompt, "You write clear, accurate summaries."));
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
    if (!doc.trim()) return setError("Paste in the document text first.");
    if (!question.trim()) return setError("Type a question.");
    setError("");
    setLoading(true);
    try {
      const prompt = `Document:\n${doc}\n\nQuestion: ${question}\n\nAnswer using only information from the document.`;
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
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {history.map((turn, i) => (
            <div key={i} style={{ borderTop: `1px solid ${line}`, paddingTop: "16px" }}>
              <p style={{ fontWeight: 600, fontSize: "14px", marginBottom: "6px", color: teal }}>{turn.q}</p>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, whiteSpace: "pre-wrap", color: ink }}>{turn.a}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese", "Japanese",
  "Korean", "Mandarin Chinese", "Arabic", "Hindi", "Russian", "Dutch",
];

function TranslateTool() {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("Spanish");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    if (!text.trim()) return setError("Enter some text to translate.");
    setError("");
    setLoading(true);
    setResult("");
    try {
      const prompt = `Translate the following text into ${lang}. Return only the translation, nothing else.\n\nText:\n${text}`;
      setResult(await callClaude(prompt, "You are a precise, natural-sounding translator."));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <Field label="Text to translate">
        <textarea
          rows={5}
          style={inputStyle}
          placeholder="Type or paste text here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <Field label="Translate into">
        <select style={inputStyle} value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <RunButton onClick={run} loading={loading} disabled={loading}>
        Translate
      </RunButton>
      <ErrorNote msg={error} />
      <ResultBlock text={result} />
    </Panel>
  );
}

function ImageTool() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [error, setError] = useState("");

  const run = () => {
    if (!prompt.trim()) return setError("Describe the image you want first.");
    setError("");
    setLoading(true);
    setImgUrl("");
    // Pollinations.ai — free, no API key required.
    const seed = Math.floor(Math.random() * 100000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true`;
    const img = new Image();
    img.onload = () => {
      setImgUrl(url);
      setLoading(false);
    };
    img.onerror = () => {
      setError("Couldn't generate that image, try a different description.");
      setLoading(false);
    };
    img.src = url;
  };

  return (
    <Panel>
      <Field label="Describe the image you want">
        <input
          style={inputStyle}
          placeholder="A lighthouse at sunset, watercolor style"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
      </Field>
      <RunButton onClick={run} loading={loading} disabled={loading}>
        Generate image
      </RunButton>
      <ErrorNote msg={error} />
      {imgUrl && (
        <div style={{ marginTop: "22px" }}>
          <img
            src={imgUrl}
            alt={prompt}
            style={{ width: "100%", borderRadius: "4px", border: `1px solid ${line}`, display: "block" }}
          />
          <p style={{ fontSize: "12px", color: inkDim, marginTop: "10px" }}>
            Generated via Pollinations.ai, a free third-party image service.
          </p>
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
        background: bg,
        minHeight: "700px",
        display: "flex",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } ::placeholder { color: ${inkDim}; opacity: 0.7; }`}</style>

      <div
        style={{
          width: "168px",
          flexShrink: 0,
          borderRight: `1px solid ${line}`,
          padding: "36px 0",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div style={{ padding: "0 22px", marginBottom: "30px" }}>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: "20px", color: ink }}>Toolkit</div>
        </div>
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
                gap: "11px",
                padding: "11px 22px",
                fontSize: "13.5px",
                fontFamily: "inherit",
                border: "none",
                borderLeft: isActive ? `2px solid ${gold}` : "2px solid transparent",
                background: isActive ? "rgba(217,165,74,0.08)" : "transparent",
                color: isActive ? gold : inkDim,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: "44px 40px", maxWidth: "700px" }}>
        <p style={{ fontSize: "13px", color: inkDim, margin: "0 0 26px" }}>
          {TOOLS.find((t) => t.id === active)?.label} tool
        </p>
        {active === "write" && <WriteTool />}
        {active === "data" && <DataTool />}
        {active === "digest" && <DigestTool />}
        {active === "ask" && <AskTool />}
        {active === "translate" && <TranslateTool />}
        {active === "image" && <ImageTool />}
      </div>
    </div>
  );
}
