const clickHandlerToDisplayGIF = async function(e) {
  let compiledFrames = void 0;
  let delays = void 0;
  let index = 0;
  let isVariableDelays = false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const drawFrameTimeout = function() {
    if (!(index < compiledFrames.length)) index = 0;
    ctx.putImageData(...compiledFrames[index]);
    setTimeout(drawFrameTimeout, delays[index]);
    ++index;
  };
  const drawFrameInterval = function() {
    if (!(index < compiledFrames.length)) index = 0;
    ctx.putImageData(...compiledFrames[index]);
    ++index;
  };
  const target = e.currentTarget.parentNode, wait = document.createTextNode("Please wait, loading GIF...");
  const url = e.currentTarget.dataset.url;
  target.replaceChild(wait, e.currentTarget);
  const worker = new Worker("./script/gif-engine-js.min.js");
  worker.onmessage = e => {
    if (e.data[0] === "log") {
      window["ayy"] = e.data[1];
      return;;
    }
    [compiledFrames, delays] = e.data;
    canvas.width = e.data[2];
    canvas.height = e.data[3];
    target.replaceChild(canvas, wait);
    if (delays.length > 1)
      for (let i = 1; delays.length > i; ++i)
        if (delays[0] !== delays[i]) {
          isVariableDelays = true;
          break;
        }
    if (isVariableDelays)
      drawFrameTimeout();
    else
      setInterval(drawFrameInterval, delays[0]);
    worker.terminate();
  };
  worker.onerror = e => {
    console.error(e);
  };
  const a = document.createElement("a");
  a.setAttribute("href", url);
  worker.postMessage(a.href);
};

for (let el of document.querySelectorAll("[class^='example'] button"))
  el.addEventListener("click", clickHandlerToDisplayGIF, { once: true });

document.addEventListener("DOMContentLoaded", () => document.body.firstElementChild.style.width = "542px");

document.querySelector(".hash").addEventListener("click", e => {
  e.preventDefault();
  document.body.firstElementChild.removeAttribute("style");
  setTimeout(loc => location = loc, 300, e.currentTarget.href);
}, { once: true });