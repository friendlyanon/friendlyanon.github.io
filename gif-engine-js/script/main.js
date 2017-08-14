(async function(d) {
  let workerBlob = void 0;
  const clickHandlerToDisplayGIF = async function(e) {
    let compiledFrames = void 0;
    let delays = void 0;
    let index = 0;
    let isVariableDelays = false;
    const canvas = d.createElement("canvas");
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
    const target = e.currentTarget.parentNode, wait = d.createTextNode("Please wait, loading GIF...");
    const url = e.currentTarget.dataset.url;
    target.replaceChild(wait, e.currentTarget);
    const workerUrl = window.URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    const stop = _ => {
      worker.terminate();
      window.URL.revokeObjectURL(workerUrl);
      console.log("destroyed worker");
    };
    worker.onmessage = e => {
      if (e.data[0] === "log") {
        const [,...msg] = e.data;
        return console.log(...msg);
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
      stop();
    };
    worker.onerror = e => {
      console.error(e);
      stop();
    };
    const a = d.createElement("a");
    a.setAttribute("href", url);
    worker.postMessage(a.href);
  };

  for (let el of d.querySelectorAll("[class^='example'] button"))
    el.addEventListener("click", clickHandlerToDisplayGIF, { once: true });

  d.addEventListener("DOMContentLoaded", () => d.body.firstElementChild.style.width = "542px", { once: true });

  d.querySelector(".hash").addEventListener("click", e => {
    e.preventDefault();
    d.body.firstElementChild.removeAttribute("style");
    setTimeout(loc => location = loc, 300, e.currentTarget.href);
  }, { once: true });

  workerBlob = new Blob([
    await fetch("./script/gif-engine-js.min.js", {
      headers: {
        pragma: "no-cache",
        "cache-control": "no-cache"
      }
    }).then(x => x.text())
  ], {
    type: "text/javascript"
  });
}(document));