// トワ…

"use strict";

const jetriLiveFromHolodex = (x) => ({
  id: x.id,
  yt_video_key: x.id,
  bb_video_id: null,
  title: x.title,
  thumbnail: null,
  status: x.status,
  live_schedule: x.start_scheduled,
  live_start: x.start_actual ?? null,
  live_end: null,
  live_viewers: x.live_viewers ?? null,
  channel: {
    id: x.channel.id,
    yt_channel_id: x.channel.id,
    bb_space_id: null,
    name: x.channel.name,
    photo: x.channel.photo,
    published_at: null, // unused
    twitter_link: null, // unused
    view_count: 0,
    subscriber_count: 0,
    video_count: 0,
  },
});

const jetriChannelFromHolodex = (x, i) => ({
  id: x.id,
  yt_channel_id: x.id,
  bb_space_id: null,
  name: x.name,
  description: "",
  photo: x.photo,
  published_at: i, // used only for sorting
  twitter_link: x.twitter,
  view_count: 0,
  subscriber_count: x.subscriber_count,
  video_count: x.video_count,
  video_original: x.video_count,
});

const getConfig = (key, default_) => {
  const value = localStorage.getItem(key);
  if (value != null) {
    return value;
  }

  localStorage.setItem(key, default_);
  return default_;
};

const setFilteredStreams = new Set(JSON.parse(getConfig("filtered-streams", "[]")));
const setFilteredTopics = new Set(JSON.parse(getConfig("filtered-topics", "[]")));

const handleLive = ({ target }) => {
  const streams = {
    live: [],
    upcoming: [],
    ended: [],
    cached: true,
  };
  for (const stream of JSON.parse(target.responseText)) {
    const isYoutubeStream = stream.placeholderType !== "external-stream"
      && (stream.status === "live" || stream.status === "upcoming");
    const isHololiveStream = stream.channel.org === "Hololive";
    const isAllowedStream = !setFilteredStreams.has(stream.id);
    const isAllowedTopic = !setFilteredTopics.has(stream.topic_id);
    if (isYoutubeStream && isHololiveStream && isAllowedStream && isAllowedTopic) {
      streams[stream.status].push(jetriLiveFromHolodex(stream));
    }
  }

  Object.defineProperty(target, "responseText", {
    value: JSON.stringify(streams),
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return streams;
};

const handleChannels = ({ target }) => {
  const channels = JSON.parse(target.responseText).map(jetriChannelFromHolodex);
  const result = { count: 1, total: 1, channels };
  Object.defineProperty(target, "responseText", {
    value: JSON.stringify(result),
    writable: true,
    enumerable: true,
    configurable: true,
  });

  return result;
};

const makeLoadHandler = (wrapper, name) => (fn) => (event) => {
  if (event.target.readyState === 4) {
    const detail = wrapper(event);
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }
  fn.call(event.target, event);
};

const originalXhr = XMLHttpRequest;
window.XMLHttpRequest = class XMLHttpRequest extends originalXhr {
  constructor() {
    super();
    this._wrapper = null;
  }

  open(method, url) {
    if (method.toUpperCase() === "GET") {
      const _url = new URL(url, "https://api.holotools.app/");
      const pair = this._map.get(_url.pathname);
      if (pair != null) {
        [this._wrapper, url] = pair;
      }
    }

    return super.open(method, url);
  }

  set onreadystatechange(fn) {
    if (this._wrapper != null) {
      super.onreadystatechange = this._wrapper(fn);
    } else {
      super.onreadystatechange = fn;
    }
  }

  get onreadystatechange() {
    return super.onreadystatechange;
  }
};

const holodexLiveApiUrl =
  "https://holodex.net/api/v2/live?type=placeholder%2Cstream&org=Hololive";
const holodexChannelsApiUrl =
  "https://holodex.net/api/v2/channels?limit=100&offset=0&type=vtuber&org=Hololive&sort=suborg&order=asc";

Object.defineProperty(window.XMLHttpRequest.prototype, "_map", {
  value: new Map([
    ["/v1/live", [makeLoadHandler(handleLive, "jetri-live"), holodexLiveApiUrl]],
    ["/v1/channels", [makeLoadHandler(handleChannels, "jetri-channels"), holodexChannelsApiUrl]],
  ]),
  writable: true,
  configurable: true,
});
