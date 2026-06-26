"use client";

import { useState } from "react";

type SubmitState = "idle" | "sending" | "done" | "error";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (!rating) {
      setState("error");
      setMessage("Lütfen 1–5 arası puan verin.");
      return;
    }
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/store/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, authorName, authorEmail, rating, title, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("done");
        setMessage("Yorumunuz alındı. Onaylandıktan sonra yayınlanacaktır. Teşekkürler!");
      } else {
        setState("error");
        setMessage(data.error || "Yorum gönderilemedi. Lütfen tekrar deneyin.");
      }
    } catch {
      setState("error");
      setMessage("Bağlantı hatası. Lütfen tekrar deneyin.");
    }
  }

  if (state === "done") {
    return <p className="kn-review-form__done">{message}</p>;
  }

  const activeStar = hover || rating;

  return (
    <form className="kn-review-form" onSubmit={handleSubmit}>
      <h3 className="kn-review-form__title">Yorum yaz</h3>

      <div className="kn-review-form__rating" role="radiogroup" aria-label="Puan">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            type="button"
            key={i}
            className={`kn-review-form__star ${i <= activeStar ? "is-on" : ""}`}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${i} yıldız`}
            aria-pressed={rating === i}
          >
            ★
          </button>
        ))}
      </div>

      <div className="kn-review-form__row">
        <input
          className="kn-review-form__input"
          type="text"
          placeholder="Adınız *"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={80}
          required
        />
        <input
          className="kn-review-form__input"
          type="email"
          placeholder="E-posta (yayınlanmaz)"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          maxLength={160}
        />
      </div>

      <input
        className="kn-review-form__input"
        type="text"
        placeholder="Başlık (opsiyonel)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />

      <textarea
        className="kn-review-form__textarea"
        placeholder="Deneyiminizi paylaşın *"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        required
      />

      {state === "error" ? <p className="kn-review-form__error">{message}</p> : null}

      <button type="submit" className="kn-review-form__submit" disabled={state === "sending"}>
        {state === "sending" ? "Gönderiliyor…" : "Yorumu gönder"}
      </button>
      <p className="kn-review-form__note">
        Yorumlar yayınlanmadan önce moderasyondan geçer.
      </p>
    </form>
  );
}
