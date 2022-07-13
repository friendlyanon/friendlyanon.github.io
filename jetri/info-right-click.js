"use strict";

const locale = (() => {
  const value = localStorage.getItem("infoRightClickLocale");
  if (value != null) {
    return value;
  }

  const defaultValue = "ja-JP";
  localStorage.setItem("infoRightClickLocale", defaultValue);
  return defaultValue;
})();

const formatTimeSegment = (timestamp) => String(timestamp).padStart(2, "0");

const formatTime = (timestamp) => {
  const seconds = timestamp / 1000 | 0;
  const minutes = seconds / 60 | 0;
  const hours = minutes / 60 | 0;

  return [hours % 24, minutes % 60, seconds % 60]
    .map(formatTimeSegment)
    .join(":");
};

const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const numberFormat = new Intl.NumberFormat(locale);

const subscriberMap = new Map();

async function promptModal(info) {
  const { body } = document;
  const close = document.createElement("button");
  const overlay = document.createElement("div");
  overlay.className = "info-modal-overlay";
  body.appendChild(overlay);

  const modal = document.createElement("div");
  modal.className = "info-modal";
  body.appendChild(modal);

  try {
    modal.insertAdjacentHTML(
      "afterbegin",
      `<div class="info-modal-header"><div>Info about the stream of ${info.channel.name}</div></div>`,
    );

    close.className = "info-modal-close";
    close.innerHTML = "×";
    modal.firstElementChild.appendChild(close);

    const lines = [];

    const now = Date.now();
    const schedule = new Date(info.live_schedule);
    lines.push(
      `Subscribers: ${numberFormat.format(subscriberMap.get(info.channel.yt_channel_id) ?? 0)}`,
      `Title: ${info.title}`,
      `Schedule: ${dateTimeFormat.format(schedule)}`,
    );

    if (info.live_start) {
      const start = new Date(info.live_start);
      const delay = start - schedule;
      const uptime = formatTime(now - start);
      lines.push(
        `Start: ${dateTimeFormat.format(start)}`,
        `Delay: ${!(delay <= 0) ? formatTime(delay) : "---"}`,
        `Uptime: ${uptime}`,
      );
    } else if (now - schedule > 0) {
      lines.push(`Delay: ${formatTime(now - schedule)}`);
    } else {
      lines.push("Delay: ---");
    }

    const listeners = info.live_viewers;
    lines.push(`Listeners: ${listeners ? numberFormat.format(listeners) : "---"}`);

    modal.insertAdjacentHTML(
      "beforeend",
      "<div>" + lines.join("</div><div>") + "</div>",
    );
  } catch (error) {
    console.error(error);
  }

  let resolve;
  const promise = new Promise(_ => resolve = _);
  const handler = (e) => {
    const { target } = e;
    if (overlay === target || close === target) {
      e.preventDefault();
      return resolve();
    }
  };

  document.addEventListener("mouseup", handler);
  close.focus();

  await promise;
  body.removeChild(overlay);
  body.removeChild(modal);
}

const { indexOf, some } = Array.prototype;
let data = null;

document.addEventListener("contextmenu", (e) => {
  if (data == null) {
    return;
  }
  e.preventDefault();

  const box = e.target.closest(".live-box");
  if (some.call(box.children, (x) => x.classList.contains("live-timer"))) {
    return;
  }

  void promptModal(data[indexOf.call(box.parentNode.children, box)]);
});

document.addEventListener("jetri-channels", ({ detail }) => {
  for (const { id, subscriber_count } of detail.channels) {
    subscriberMap.set(id, subscriber_count);
  }
});

document.addEventListener("jetri-live", ({ detail }) => {
  data = detail.live;
});
