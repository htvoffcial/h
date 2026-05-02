import express from "express";
import multer from "multer";
import ICAL from "ical.js";
import Epub from "epub-gen";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dt) {
  const jsDate = dt.toJSDate();
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(jsDate);
}

function buildB5Styles(fontSize) {
  return `
    @page { size: B5; margin: 18mm 15mm; }
    body {
      font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
      line-height: 1.8;
      font-size: ${fontSize}px;
      margin: 0;
      color: #222;
    }
    h1, h2 {
      font-family: "Hiragino Sans", "Yu Gothic", sans-serif;
      line-height: 1.35;
    }
    h1 { font-size: 1.6em; margin-bottom: 0.8em; }
    h2 { font-size: 1.2em; margin-top: 1.2em; margin-bottom: 0.5em; border-bottom: 1px solid #bbb; }
    .event { margin-bottom: 1em; padding: 0.6em; border: 1px solid #ddd; border-radius: 6px; }
    .meta { font-size: 0.9em; color: #555; }
    .desc { white-space: pre-wrap; margin-top: 0.4em; }
  `;
}

function toChapterHtml(title, events) {
  const rows = events
    .map((event) => {
      const summary = escapeHtml(event.summary || "(タイトルなし)");
      const start = event.startDate ? formatDate(event.startDate) : "未設定";
      const end = event.endDate ? formatDate(event.endDate) : "未設定";
      const location = escapeHtml(event.location || "");
      const desc = escapeHtml(event.description || "");
      return `
        <article class="event">
          <h2>${summary}</h2>
          <div class="meta">${start} 〜 ${end}${location ? ` / ${location}` : ""}</div>
          ${desc ? `<div class="desc">${desc}</div>` : ""}
        </article>
      `;
    })
    .join("\n");

  return `<h1>${escapeHtml(title)}</h1>${rows || "<p>予定はありません。</p>"}`;
}

app.post("/convert", upload.single("icalFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "icsファイルをアップロードしてください。" });
    }

    const title = req.body.title?.trim() || "Calendar Export";
    const fontSize = Number.parseInt(req.body.fontSize, 10) || 16;

    const icsText = req.file.buffer.toString("utf-8");
    const jcal = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents("vevent");
    const events = vevents.map((v) => new ICAL.Event(v));

    events.sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.toJSDate() - b.startDate.toJSDate();
    });

    const chapters = [
      {
        title: "スケジュール",
        data: toChapterHtml(title, events)
      }
    ];

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ical-epub-"));
    const outPath = path.join(tmpDir, `${title.replace(/[^\w\-]+/g, "_") || "calendar"}.epub`);

    const options = {
      title,
      author: "iCal Converter",
      output: outPath,
      content: chapters,
      css: buildB5Styles(fontSize),
      appendChapterTitles: false
    };

    await new Epub(options).promise;

    res.download(outPath, `${title}.epub`, async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "変換中にエラーが発生しました。ics形式が正しいか確認してください。" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
