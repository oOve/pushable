/*
▓█████▄  ██▀███           ▒█████  
▒██▀ ██▌▓██ ▒ ██▒        ▒██▒  ██▒
░██   █▌▓██ ░▄█ ▒        ▒██░  ██▒
░▓█▄   ▌▒██▀▀█▄          ▒██   ██░
░▒████▓ ░██▓ ▒██▒ ██▓    ░ ████▓▒░
 ▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▓▒    ░ ▒░▒░▒░ 
 ░ ▒  ▒   ░▒ ░ ▒░ ░▒       ░ ▒ ▒░ 
 ░ ░  ░   ░░   ░  ░      ░ ░ ░ ▒  
   ░       ░       ░         ░ ░  
 ░                 ░              
 */

const MOD_NAME = "pushable";
const LAMBDA = 5;

function Lang(k){
  return game.i18n.localize("PUSHABLE."+k);
}

let pushable_socket;
Hooks.once("socketlib.ready", () => {
  // socketlib is activated, lets register our function moveAsGM
	pushable_socket = socketlib.registerModule("pushable");	
	pushable_socket.register("moveAsGM", doMoveAsGM);
});


function doMoveAsGM(updates){
  canvas.scene.updateEmbeddedDocuments('Token', updates, {pushable_triggered:true});
}


/**
 * Display a text above a token
 * @param {*} token A token object
 * @param {String} text The text to display above the token
 */
 function scrollText(token, text){
  let config = {
    x: token.x,
    y: token.y,
    text: text,
    anchor: CONST.TEXT_ANCHOR_POINTS.TOP, 
    fill:   "#FFFFFF", 
    stroke: "#FFFFFF"
  }
  canvas.interface.createScrollingText(token, text, config);
}

function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  // Check x and y for overlap
  return !(x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2);  
}

function isPushable(token){
  return token.document?.flags.pushable?.isPushable ||
         token.flags?.pushable?.isPushable; 
}

// Return list of tokens overlapping 'token'
function find_collisions(token){
  let x1=token.x+LAMBDA;
  let y1=token.y+LAMBDA;
  let w1=token.hitArea.x + token.hitArea.width -(LAMBDA*2);
  let h1=token.hitArea.y + token.hitArea.height-(LAMBDA*2);
  let collisions = [];

  for (let tok of canvas.tokens.placeables){
    if (tok.id != token.id){
        let x2=tok.x;
        let y2=tok.y;
        let w2=tok.hitArea.x + tok.hitArea.width;
        let h2=tok.hitArea.y + tok.hitArea.height;
        
        if (rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2)){
          collisions.push(tok);
        }
    }
  }
  return collisions;
}

function duplicate_tk(token){
  return {  
          id:token.id,
          x: token.x, 
          y: token.y,
          flags: { pushable:{isPushable: isPushable(token)}},            
          hitArea: token.hitArea,
          _id:token.id
        };
}

// Does the centerpoint of 'token' collide with wall if moved along 'direction'
function collides_with_wall(token, direction){
  let cx = token.x + (token.hitArea.width/2);
  let cy = token.y + (token.hitArea.height/2);
  let ray = new Ray({x:cx, y:cy}, {x:cx+direction.x, y:cy+direction.y});
  return canvas.walls.checkCollision(ray, {type:'move',mode:'any'});
}


// Tests the candidate moved token (in its new position) coming via "direction" 
// Recursively tests new candidates after this move
function candidate_move(token, direction, updates, depth){
  let pushlimit = game.settings.get('pushable', 'max_depth');
  if((depth > pushlimit+1)&&(pushlimit>0)){return false;} 
  
  let result = {valid: true};
  let colls = find_collisions(token);
  // Exit early to avoid doing sqrt
  if (colls.length==0){return result;}
  
  
  let len = Math.sqrt(direction.x**2+direction.y**2);
  let dir = {x:direction.x/len, y:direction.y/len};

  let wePushable = isPushable(token);

  for (let coll_obj of colls){
    let nx=coll_obj.x;
    let ny=coll_obj.y;
  
    let collPushable = isPushable(coll_obj);
    
    // Are we the pushable, in that case we can't be pushed onto a non-pushble, if that setting is enabled
    if (wePushable && !collPushable ){
      if (game.settings.get(MOD_NAME, 'collideWithNonPushables')){
        return {
          valid: false,
          reason: "CantPushEntity"
        }
      } else {
        // Don't push the non-pushable in that case
        continue;
      }
    }
    // Are we not a pushable, then we can move through (into) a non-pushable
    if (!wePushable && !collPushable ){
      continue;
    }
    
    if (direction.x){ // dir.x != 0
      //                     positive                        :  negative
      nx = (direction.x>0)?( token.x + token.hitArea.width  ):( nx = token.x - coll_obj.hitArea.width);
    }
    if (direction.y){ //     Positive                        :   Negative
      ny = (direction.y>0)?( token.y + token.hitArea.height ):( token.y - coll_obj.hitArea.height);
    }
    let new_dir = {x: nx-coll_obj.x, y: ny-coll_obj.y};
    
    // Does this "new_dir" take coll_obj through a wall?
    if (collides_with_wall(coll_obj, new_dir)){
      return {
        valid: false,
        reason: "CantPushWall"
      };
    }
    
    updates.push({_id:coll_obj.id, id:coll_obj.id, x:nx, y:ny});
    if (overLimit(updates)){
      return {valid:false, reason: 'CantPushMax'};
    }
    
    let candidate_token = duplicate_tk(coll_obj);
    candidate_token.x += new_dir.x;
    candidate_token.y += new_dir.y;
    let res = candidate_move(candidate_token, new_dir, updates, depth+1);   
    result.valid &= res.valid;
    if (!res.valid){
      result.reason = res.reason;
    }
  }
  return result;
}

// Returns a token overlapping point 'p', return null if none exists.
function tokenAtPoint(p){
  for (let tok of canvas.tokens.placeables){
    if (p.x > tok.x && 
        p.x < tok.x+tok.hitArea.width &&
        p.y > tok.y &&
        p.y < tok.y+tok.hitArea.height){
          return tok;
        }
  }
  return null;
}

// Find candidate token to be pulled in direction 'direction'
function checkPull(token, direction, updates){
  // l is the length of the direction vector
  let l = Math.sqrt( direction.x**2 + direction.y**2 );
  // nv is the normalized direction vector
  let nv = {x:direction.x/l, y:direction.y/l};
  let center = {x: token.x + token.hitArea.width/2, y: token.y + token.hitArea.height/2};
  let pull_from = {x: center.x - token.hitArea.width *nv.x,
                   y: center.y - token.hitArea.height*nv.y };
  let ray = new Ray(pull_from, center);
  if (canvas.walls.checkCollision(ray, {type:'move',mode:'any'})){
    return {valid:false, reason: "CantPull"};
  }
  
  // We also need to check if there are other tokens, than the "puller" at the destination
  let colls = find_collisions(token);
  if (colls.length && game.settings.get(MOD_NAME, 'collideWithNonPushables')){
    return { valid:false, reason: "CantPullEntity" }
  }
  
  let pulle = tokenAtPoint(pull_from);  
  if (pulle){
    if (pulle.document.getFlag(MOD_NAME, 'isPullable')){
      updates.push({id:pulle.id, x: pulle.x+direction.x, y: pulle.y+direction.y, _id:pulle.id});
    }
    else{
      return {valid: false, reason: "CantPull"};
    }
  }
  return {valid: true};
}


function showHint(token, hint, isError=true){
  if (game.settings.get(MOD_NAME, "showHints")){
    scrollText(token, hint);
  }
}
function overLimit( updates ){
  let limit = game.settings.get(MOD_NAME, 'max_depth');
  let valid = (limit<0) || (updates.length <= limit);
  return !valid;
}



// Hook into token movemen. Push 'pushables' along with this movement, and cancel movement if pushing is not possible
Hooks.on('preUpdateToken', (token, change, options, user_id)=>{
  if (hasProperty(options, 'pushable_triggered')){ return true; }  // We don't need to pre-evaluate already approved moves.
  if (!hasProperty(change,'x')&&!(hasProperty(change, 'y'))){return true;}

  let nx = (hasProperty(change, 'x'))?(change.x):(token.x);
  let ny = (hasProperty(change, 'y'))?(change.y):(token.y);
  let direction = {x:nx-token.x, y: ny-token.y};
  let tok=canvas.tokens.get(token.id);
    
  let token_after_move = duplicate_tk(tok);
  token_after_move.x = nx;
  token_after_move.y = ny;
  let res = {valid:true};

  let updates = [];
  if (game.settings.get("pushable", "pull")){
    let pulling = false;
    let pk=game.keybindings.get("pushable", 'pull_key');
    for (let k of pk){
      pulling = pulling || keyboard.downKeys.has(k.key);
    }
    if (pulling){
      let res = checkPull(tok, direction, updates);
      if (!res.valid ){
        showHint(tok, Lang(res.reason));
      }
    }
  }

  res = candidate_move(token_after_move, direction, updates, 1);  
  if(!res.valid){
    showHint( tok, Lang(res.reason));
  }
  if (res.valid && updates.length){
    // This move is valid. Execute our updates as GM
    pushable_socket.executeAsGM("moveAsGM",updates);
  }

  return (res.valid==true)||game.user.isGM;
});


// Settings:
Hooks.once("init", () => {    
  game.settings.register("pushable", "pull", {
    name: Lang('PullTitle'),
    hint: Lang('PullHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register("pushable", "collideWithNonPushables", {
    name: Lang('collideWithNonPushables'),
    hint: Lang('collideWithNonPushablesHint'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register("pushable", "showHints", {
    name: Lang('ShowHintsTitle'),
    hint: Lang('ShowHintsText'),
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register("pushable", "max_depth", {
    name: Lang("MaxDepth"),
    hint: Lang("MaxHint"),
    scope: 'world',
    config: true,
    type: Number,
    default: -1
  });
  game.keybindings.register("pushable", "pull_key", {
    name: Lang('PullKey'),
    hint: Lang("PullKeyHint"),
    editable: [
      {
        key: 'KeyP'
      }
    ],
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

});



function createCheckBox(app, fields, data_name, title, hint){  
  const label = document.createElement('label');
  label.textContent = title; 
  const input = document.createElement("input");
  input.name = 'flags.'+MOD_NAME+'.' + data_name;
  input.type = "checkbox";
  input.title = hint;
  
  if (app.token.getFlag(MOD_NAME, data_name)){
    input.checked = "true";
  }

  fields.append(label);
  fields.append(input);
}


// Hook into the token config render
Hooks.on("renderTokenConfig", (app, html) => {
  if (!game.user.isGM) return;

  // Create a new form group
  const formGroup = document.createElement("div");
  formGroup.classList.add("form-group");
  formGroup.classList.add("slim");

  // Create a label for this setting
  const label = document.createElement("label");
  label.textContent = Lang("Pushable");
  formGroup.prepend(label);

  // Create a form fields container
  const formFields = document.createElement("div");
  formFields.classList.add("form-fields");
  formGroup.append(formFields);

  createCheckBox(app, formFields, 'isPushable', Lang('Pushable'), '');
  createCheckBox(app, formFields, 'isPullable', Lang('Pullable'), '');
  
  // Add the form group to the bottom of the Identity tab
  html[0].querySelector("div[data-tab='character']").append(formGroup);

  // Set the apps height correctly
  app.setPosition();
});

