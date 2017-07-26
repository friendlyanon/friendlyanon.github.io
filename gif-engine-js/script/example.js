(function(d) {
  let current = 0;
  let frameCount = 0;
  let index = -1;
  let frames = [];
  let delays = [];
  let width = 0;
  let height = 0;
  const canvas = d.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const track = () => performance.now();
  let time = 0;
  const display = function() {
    if (!(index < frameCount)) index = 0;
    let now = track();
    if (now - time > delays[index]) {
      ctx.clearRect(0, 0, width, height);
      ctx.putImageData(frames[index], 0, 0);
      time = now;
      ++index;
    }
    requestAnimationFrame(display);
  };
  d.querySelector("button").addEventListener("click", e => {
    e.currentTarget.remove();
    fetch("./img/gif.gif")
      .then(x => x.arrayBuffer())
      .then(GIF)
      .then(async (o, err) => {
        frameCount = o.frames.length;
        frames = new Array(frameCount);
        delays = o.frames.map(frameObj =>
          frameObj.graphicExtension.delay
        );
        ({ width, height } = o.descriptor);
        while(++index < frameCount)
          frames[index] = await o.toImageData(index);
        canvas.width = width;
        canvas.height = height;
        canvas.setAttribute("style", `height: ${height}px; width: ${width}px;`);
        d.body.children[0].appendChild(canvas);
        requestAnimationFrame(display);
      });
  }, { once: true });
}(document));