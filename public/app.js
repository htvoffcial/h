const form = document.getElementById("convertForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "変換中...";

  try {
    const formData = new FormData(form);
    const response = await fetch("/convert", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "変換に失敗しました");
    }

    const blob = await response.blob();
    const title = formData.get("title") || "calendar";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.epub`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent = "EPUBを生成しました。ダウンロードを確認してください。";
  } catch (err) {
    statusEl.textContent = `エラー: ${err.message}`;
  }
});
