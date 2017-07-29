(function(d) {
  let frameCount = 0;
  let index = -1;
  let compiledFrames = void 0;
  let delays = void 0;
  let disposals = void 0;
  let transparentColorIndexes = void 0;
  let width = 0;
  let height = 0;
  const canvas = d.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const drawFrame = function() {
    if (!(index < frameCount)) index = 0;
    const [{ data: imgData, width: w, height: h }, left, top] = compiledFrames[index];
    switch(disposals[index]) {
     case 2:
      ctx.clearRect(left, top, w, h);
      break;
     case 3:
      ctx.putImageData(...compiledFrames[(index === 0 ? frameCount : index) - 1]);
      break;
    }
    let current = ctx.getImageData(left, top, w, h);
    for (let i = 0; w * h > i; ++i) {
      let offset = i * 4;
      if (imgData[offset + 3] === 0)
        continue;
      current.data[offset]   = imgData[offset];
      current.data[++offset] = imgData[offset];
      current.data[++offset] = imgData[offset];
      current.data[++offset] = imgData[offset];
    }
    ctx.putImageData(current, left, top);
    setTimeout(drawFrame, Math.max(delays[index] - 5, 0));
    ++index;
  };
  d.querySelector("button").addEventListener("click", e => {
    const target = e.currentTarget.parentNode;
    e.currentTarget.remove();
    fetch("./img/gif.gif")
      .then(x => x.arrayBuffer())
      .then(GIF)
      .then(async (o, err) => {
        frameCount = o.frames.length;
        compiledFrames = new Array(frameCount);
        delays = o.frames.map(frameObj =>
          frameObj.graphicExtension.delay
        );
        disposals = o.frames.map(frameObj =>
          frameObj.graphicExtension.disposalMethod
        );
        ({ width, height } = o.descriptor);
        while(++index < frameCount)
          compiledFrames[index] = await o.toImageData(index);
        canvas.width = width;
        canvas.height = height;
        canvas.setAttribute("style", `height: ${height}px; width: ${width}px;`);
        target.appendChild(canvas);
        requestAnimationFrame(drawFrame);
      });
  }, { once: true });
}(document));