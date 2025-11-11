// script.js — Canvas implementation of your Turtle game
(() => {
  // --- State and constants (mirrors your Python) ---
  const canvas = document.getElementById('turtleCanvas');
  const ctx = canvas.getContext('2d');

  // logical canvas size (matches viewBox 800x600 from your Reflex SVG)
  const W = 800, H = 600;
  // ensure canvas resolution scales correctly
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // state
  const State = {
    x: 400,
    y: 300,
    heading: 0, // degrees, same convention as your Reflex code
    speed: 5,
    is_pen_down: true,
    pen_color: 'white',
    pen_size: 4,
    paths: [], // {start:{x,y}, end:{x,y}, color, size}
    polygons: [], // {points: [{x,y},...], color}
    text_elements: [], // {content, x, y, color}
    bg_color: 'black',
    fill_color: 'white',
    is_filling: false,
    fill_points: [],
    text_input_visible: false,
    snap_lock: false,
    pressed_keys: new Set(),
    show_mobile_prompt: false,
    is_mobile: false,
    COLOR_CYCLE: ['white','red','blue','green','yellow','orange','purple','cyan','magenta','lime','pink','teal'],
    BG_COLOR_CYCLE: ['black','darkslateblue','darkgreen','maroon','indigo','saddlebrown','#333333'],
    SPEED_CYCLE: [5,10,25,50,75,100],
  };

  // Helper to update DOM status
  const $ = id => document.getElementById(id);
  function updateStatus() {
    $('penStatus').textContent = State.is_pen_down ? 'DOWN' : 'UP';
    $('penColor').textContent = State.pen_color;
    $('fillStatus').textContent = State.is_filling ? 'ON' : 'OFF';
    $('fillColor').textContent = State.fill_color;
    $('speed').textContent = State.speed;
    $('snapLock').textContent = State.snap_lock ? 'ON' : 'OFF';
  }

  // Movement math (match your Python)
  function rad(deg){ return deg * Math.PI / 180; }
  function moveForward(record=true){
    const r = rad(State.heading);
    const newX = State.x + State.speed * Math.cos(r);
    const newY = State.y - State.speed * Math.sin(r);
    if (State.is_pen_down && record) {
      State.paths.push({
        start: {x: State.x, y: State.y},
        end: {x: newX, y: newY},
        color: State.pen_color,
        size: State.pen_size,
      });
    }
    if (State.is_filling) {
      State.fill_points.push({x: State.x, y: State.y});
    }
    State.x = newX;
    State.y = newY;
  }
  function moveBackward(record=true){
    const r = rad(State.heading);
    const newX = State.x - State.speed * Math.cos(r);
    const newY = State.y + State.speed * Math.sin(r);
    if (State.is_pen_down && record) {
      State.paths.push({
        start: {x: State.x, y: State.y},
        end: {x: newX, y: newY},
        color: State.pen_color,
        size: State.pen_size,
      });
    }
    if (State.is_filling) {
      State.fill_points.push({x: State.x, y: State.y});
    }
    State.x = newX;
    State.y = newY;
  }
  function turnLeft(){
    if (State.snap_lock) State.heading = (State.heading + 45) % 360;
    else State.heading = (State.heading + 15) % 360;
  }
  function turnRight(){
    if (State.snap_lock) State.heading = (State.heading - 45 + 360) % 360;
    else State.heading = (State.heading - 15 + 360) % 360;
  }

  // --- Controls ---
  function cycle(array, current) {
    const i = array.indexOf(current);
    return array[(i + 1) % array.length];
  }

  function handleKeyDown(e){
    const key = e.key.toLowerCase();
    // prevent page scrolling/back navigation in many cases
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'backspace'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    State.pressed_keys.add(key);

    // immediate keydown actions (like toggles)
    if (key === ' ') {
      State.is_pen_down = !State.is_pen_down;
    } else if (key === 'c') {
      State.pen_color = cycle(State.COLOR_CYCLE, State.pen_color);
    } else if (key === 'b') {
      State.bg_color = cycle(State.BG_COLOR_CYCLE, State.bg_color);
    } else if (key === 'v') {
      State.fill_color = cycle(State.COLOR_CYCLE, State.fill_color);
    } else if (key === 'f') {
      State.is_filling = !State.is_filling;
      if (State.is_filling) {
        State.fill_points = [];
        State.fill_points.push({x: State.x, y: State.y});
      } else {
        if (State.fill_points.length > 0) {
          State.polygons.push({points: State.fill_points.slice(), color: State.fill_color});
          State.fill_points = [];
        }
      }
    } else if (key === 'z') {
      // undo last path on keydown (if available)
      if (State.paths.length > 0) State.paths.pop();
    } else if (key === 'r') {
      State.x = 400; State.y = 300; State.heading = 0;
    } else if (key === 'backspace') {
      State.paths = [];
      State.polygons = [];
      State.text_elements = [];
      State.x = 400; State.y = 300; State.heading = 0;
      State.bg_color = 'black';
    } else if (key === 't') {
      showTextInput();
    } else if (key === 'k') {
      // replicate the Reflex behavior: 4 sides, 4 moves per side
      for (let side = 0; side < 4; side++){
        for (let step = 0; step < 4; step++){
          moveForward(true);
        }
        State.heading = (State.heading - 90 + 360) % 360;
      }
    } else if (key === 'm') {
      const idx = State.SPEED_CYCLE.indexOf(State.speed);
      State.speed = State.SPEED_CYCLE[(idx + 1) % State.SPEED_CYCLE.length];
    } else if (key === 'n') {
      State.snap_lock = !State.snap_lock;
    }
    updateStatus();
  }
  function handleKeyUp(e){
    const key = e.key.toLowerCase();
    State.pressed_keys.delete(key);
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Text input overlay logic
  const textOverlay = $('textOverlay');
  const textField = $('textField');
  const drawTextBtn = $('drawTextBtn');
  const cancelTextBtn = $('cancelTextBtn');

// --- Enhanced text input logic ---
const textOverlay = $('textOverlay');
const textField = $('textField');
const drawTextBtn = $('drawTextBtn');
const cancelTextBtn = $('cancelTextBtn');

let currentText = '';  // stores typing in overlay
let typing = false;    // freeze turtle while typing

function showTextInput(){
  textOverlay.style.display = 'flex';
  currentText = '';
  textField.value = '';
  textField.focus();
  State.text_input_visible = true;
  typing = true;  // prevent turtle movement
}

function hideTextInput(){
  textOverlay.style.display = 'none';
  State.text_input_visible = false;
  typing = false;
}

function addText(char){
  currentText += char;
  textField.value = currentText;
}

function removeChar(){
  currentText = currentText.slice(0, -1);
  textField.value = currentText;
}

// submit typed text
function submitText(){
  if(currentText.trim().length > 0){
    State.text_elements.push({
      content: currentText.trim(),
      x: State.x,
      y: State.y,
      color: State.pen_color
    });
  }
  hideTextInput();
  currentText = '';
}

// button handlers
drawTextBtn.addEventListener('click', submitText);
cancelTextBtn.addEventListener('click', hideTextInput);

// capture typing and backspace
textField.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') { 
    e.preventDefault();
    submitText();
  } else if(e.key === 'Escape') {
    e.preventDefault();
    hideTextInput();
  } else if(e.key === 'Backspace'){
    e.preventDefault();
    removeChar();
  }
});

// optional: freeze turtle movement while typing
function handleKeyDown(e){
  if(typing) return; // skip movement while typing
  const key = e.key.toLowerCase();
  State.pressed_keys.add(key);
  // ...rest of your existing keydown logic...
}

function handleKeyUp(e){
  if(typing) return; 
  const key = e.key.toLowerCase();
  State.pressed_keys.delete(key);
}

    if (e.key === 'Enter') { drawTextBtn.click(); }
    if (e.key === 'Escape') hideTextInput();
  });

  // --- Movement loop (50ms) ---
  setInterval(() => {
    // If no keys pressed, do nothing
    if (State.pressed_keys.size === 0) return;

    // continuous movement handling similar to the Python background loop
    if (State.pressed_keys.has('w')) {
      moveForward(true);
    }
    if (State.pressed_keys.has('s')) {
      moveBackward(true);
    }
    if (State.pressed_keys.has('a')) {
      turnLeft();
    }
    if (State.pressed_keys.has('d')) {
      turnRight();
    }
    if (State.pressed_keys.has('z')) {
      // Already handled on keydown, but keep behavior: if held, keep popping
      if (State.paths.length > 0) State.paths.pop();
    }
    updateStatus();
  }, 50);

  // --- Rendering ---
  function draw() {
    // background
    ctx.save();
    ctx.fillStyle = State.bg_color;
    ctx.fillRect(0, 0, W, H);

    // polygons (fills) — draw first so paths on top
    for (const poly of State.polygons) {
      ctx.beginPath();
      const pts = poly.points;
      if (pts && pts.length > 0) {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.fillStyle = poly.color;
        ctx.fill();
      }
    }

    // If user is in the middle of a fill, show the polygon-in-progress
    if (State.is_filling && State.fill_points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(State.fill_points[0].x, State.fill_points[0].y);
      for (let i = 1; i < State.fill_points.length; i++) ctx.lineTo(State.fill_points[i].x, State.fill_points[i].y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = State.fill_color;
      ctx.stroke();
    }

    // paths (strokes)
    for (const p of State.paths) {
      ctx.beginPath();
      ctx.moveTo(p.start.x, p.start.y);
      ctx.lineTo(p.end.x, p.end.y);
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.color;
      ctx.stroke();
    }

    // text elements
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px Arial';
    for (const t of State.text_elements) {
      ctx.fillStyle = t.color;
      ctx.fillText(t.content, t.x, t.y);
    }

    // draw turtle (triangle) at (x,y) rotated
    drawTurtle();

    ctx.restore();
    requestAnimationFrame(draw);
  }

  function drawTurtle(){
    ctx.save();
    ctx.translate(State.x, State.y);
    // In Reflex you used transform rotate(90 - heading), so match visual orientation:
    ctx.rotate((90 - State.heading) * Math.PI / 180);
    // draw triangle pointing up (since we rotated)
    ctx.beginPath();
    ctx.moveTo(0, -12); // tip
    ctx.lineTo(10, 8);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fillStyle = State.pen_color;
    ctx.fill();
    ctx.restore();
  }

  // start the render loop
  requestAnimationFrame(draw);

  // initial status render
  updateStatus();

  // Prevent backspace from navigating away (desktop browsers)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') e.preventDefault();
  });

  // Simple mobile hint detection (not full mobile D-pad UI)
  function detectMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|iphone|ipad|mobile/i.test(ua);
    State.is_mobile = isMobile;
    if (isMobile) $('mobileHint').style.display = 'block';
  }
  detectMobile();

  // expose some debugging helpers in console (optional)
  window.__TURTLE_STATE = State;
  window.__TURTLE_reset = () => {
    State.paths = []; State.polygons = []; State.text_elements = [];
    State.x = 400; State.y = 300; State.heading = 0; State.bg_color = 'black';
    updateStatus();
  };

})();

