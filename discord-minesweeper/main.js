let bomb = "\uD83D\uDCA5";

const inRange = (number, max) => 0 <= number && number < max;

const neighbors = [
  [-1, -1], [-1, 0], [-1, 1],
  [0,  -1],          [ 0, 1],
  [1,  -1], [ 1, 0], [ 1, 1],
];

function incrementNeighbors(field, y, x) {
  const { length: height, 0: { length: width } } = field;

  for (let [j, i] of neighbors) {
    j += y;
    i += x;
    if (inRange(j, height) && inRange(i, width)) {
      const row = field[j];

      if (row[i] >= 0) {
        ++row[i];
      }
    }
  }
}

function getCell(number) {
  switch (number) {
    case -1:
      return bomb;
    case 0:
      return "\uD83D\uDFE6";
    default:
      return `${String.fromCharCode(48 + number)}\ufe0f\u20e3`;
  }
}

function stringify(row) {
  let lastSeen = -1;
  let result = "";

  for (const number of row) {
    const cell = getCell(number);

    switch ((lastSeen === 0) << 1 | number === 0) {
      case 0b00:
        result += `||${cell}||`;
        break;
      case 0b01:
        result += `||${cell}`;
        break;
      case 0b10:
        result += `||||${cell}||`;
        break;
      case 0b11:
        result += cell;
        break;
    }

    lastSeen = number;
  }

  return lastSeen === 0 ? `${result}||` : result;
}

function generate(width, height, difficulty) {
  const field = Array.from(
    { length: height },
    () => Array(width).fill(0),
  );

  const cutoff = difficulty ** 2.5;
  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      if (Math.random() < cutoff) {
        field[y][x] = -1;
        incrementNeighbors(field, y, x);
      }
    }
  }

  return field.map(stringify).join("\n");
}

const defaults = [10, 10, 0.5];
document.getElementById("generate").addEventListener("click", () => {
  bomb = document.getElementById("bomb").value;
  const [width, height] = ["width", "height"]
    .map(x => parseInt(document.getElementById(x).value, 10));
  const difficulty = parseFloat(document.getElementById("difficulty").value);
  const args = [width, height, difficulty]
    .map((x, i) => x !== x ? defaults[i] : x);
  document.getElementById("output").value = generate(...args);
});
