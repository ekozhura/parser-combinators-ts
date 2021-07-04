/**
 * This code was used as a part of PoC, done for my talk at ReactKyiv meetup:
 * https://animationsslides.brutallo.now.sh/#/
 *
 *
 * Emoji animations were inspired by this article:
 * https://matthewrayfield.com/articles/animating-urls-with-javascript-and-emojis/
 */

/**
 * Emoji Chars constructors:
 */
function emoji(char) {
  return { type: "singleEmoji", char };
}

function empty() {
  return { type: "emptyEmoji", char: "" };
}

function compose(emojiA, emojiB) {
  return { type: "composedEmoji", emojiA, emojiB };
}

/**
 * Emoji Parser:
 */

function runEmoji(emoji) {
  switch (emoji.type) {
    case "singleEmoji":
      return emoji.char;
    case "composedEmoji":
      return runEmoji(emoji.emojiA) + runEmoji(emoji.emojiB);
    case "emptyEmoji":
    default:
      return "";
  }
}

/**
 * Higher order functions to lift emojies
 */
function lift0(constValue) {
  return {
    fn() {
      return constValue;
    },
    type: "animation",
  };
}

const lift1 = (fn) => (animation) => {
  return {
    fn(time) {
      return fn(animation.fn(time));
    },
    type: "animation",
  };
};

const lift2 = (fn) => (animationA, animationB) => {
  return {
    fn(time) {
      return fn(animationA.fn(time), animationB.fn(time));
    },
    type: "animation",
  };
};

const varied = (fn) => ({ fn, type: "animation" });
const always = lift0;
const emptyA = lift0(empty);
const emojiA = lift1(emoji);
const composeA = lift2(compose);

/**
 * Helpers:
 */
const map = (fn) => (charArray) => charArray.map(fn);
const mapChar = map(emoji);

const pipe = (...fnArray) => {
  return fnArray.reduce((acc, currentFn) => {
    return compose(acc, currentFn);
  }, empty);
};

const pipeA = (...fnArray) => {
  return fnArray.reduce((acc, currentFn) => {
    return composeA(acc, currentFn);
  }, emptyA);
};

const getFrames = (frames) => {
  const emojies = mapChar(frames);
  const n = emojies.length;

  return function (t) {
    return emojies[Math.ceil(t) % n];
  };
};

const animateFrames = (frames) => varied(getFrames(frames));

const slowDownA = (speed) => varied((t) => t / speed);

function timeTrans(timeA, animation) {
  return {
    type: animation.type,
    fn: (t) => animation.fn(timeA.fn(t)),
  };
}

/**
 * Runtime:
 */
function throttleExecution(fn, fps) {
  let t1;
  let delta;
  let period = 1000 / fps;
  let t0 = Date.now();
  let clock = 0;

  function loop() {
    t1 = Date.now();
    delta = t1 - t0;
    if (delta > period) {
      fn(clock);
      clock++;
      t0 = t1 - (delta % period);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function runAnimation(emojiAnimation, framesPerSecond = 24) {
  throttleExecution((t) => {
    location.hash = runEmoji(emojiAnimation.fn(t));
  }, framesPerSecond);
}

/**
 * Examples:
 */

let clock = [
  "🕐",
  "🕑",
  "🕒",
  "🕓",
  "🕔",
  "🕕",
  "🕖",
  "🕗",
  "🕘",
  "🕙",
  "🕚",
  "🕛",
];
let moon = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"];

let skinTones = ["🏻", "🏼", "🏽", "🏾", "🏿"];

let babyFaceEmojiA = emojiA(always("👶"));

let shiftArray = (array, shift = 0) => {
  let shiftBy = shift;
  if (shiftBy > array.length) {
    shiftBy = 0;
  }
  const first = array.slice(0, shiftBy);
  const second = array.slice(shiftBy, array.length);
  return second.concat(first);
};

let FRAMES_PER_SECOND = 5;

let babyFace = (skinTones) =>
  composeA(babyFaceEmojiA, animateFrames(skinTones));

let clockAnimation = timeTrans(slowDownA(2.5), animateFrames(clock));

runAnimation(
  pipeA(
    clockAnimation,
    babyFace(skinTones),
    babyFace(shiftArray(skinTones, 1)),
    babyFace(shiftArray(skinTones, 2)),
    babyFace(shiftArray(skinTones, 3))
  ),
  FRAMES_PER_SECOND
);
