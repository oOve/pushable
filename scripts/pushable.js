

let pushable_socket;
Hooks.once("socketlib.ready", () => {
  // socketlib is activated, lets register our function moveAsGM
	pushable_socket = socketlib.registerModule("pushable");	
	pushable_socket.register("moveAsGM", doMoveAsGM);
});


function doMoveAsGM(updates){
  for (t of updates){      
    let tk=canvas.tokens.get(t.id);      
    tk.document.update(t);
  }
}


function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  // Check x and y for overlap
  if (x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2){
      return false;
  }
  return true;
}


function find_collision(token){  
  let x1=token.data.x+1;
  let y1=token.data.y+1;
  let w1=token.hitArea.x + token.hitArea.width-2;
  let h1=token.hitArea.y + token.hitArea.height-2;
  
  for (let tok of canvas.tokens.placeables){
    if (tok.data.flags.pushable &&
        tok.data.flags.pushable.isPushable &&
        tok.id != token.id 
      ){
        let x2=tok.data.x;
        let y2=tok.data.y;
        let w2=tok.hitArea.x + tok.hitArea.width;
        let h2=tok.hitArea.y + tok.hitArea.height;
        
        if (rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2)){
          return tok;
        }
    }
  }
  return null;
}


function collides_with_wall(token, direction){
  let cx = token.data.x + (token.hitArea.width/2);
  let cy = token.data.y + (token.hitArea.height/2);
  let ray = new Ray({x:cx, y:cy}, {x:cx+direction.x, y:cy+direction.y});
  return canvas.walls.checkCollision(ray);
}


// Tests the candidate moved token (in its new position) coming via "direction" 
function candidate_move(token, direction, updates){
  let coll_obj = find_collision(token);
  if (coll_obj){
    let nx=coll_obj.data.x;
    let ny=coll_obj.data.y;
    if (direction.x){ // dir.x != 0
      //                     positive                            :  negative
      nx = (direction.x>0)? (token.data.x  + token.hitArea.width): (nx = token.data.x - coll_obj.hitArea.width);
    }
    if (direction.y){ //     Positive                            :   Negative
      ny = (direction.y>0)?(token.data.y + token.hitArea.height) : (token.data.y - coll_obj.hitArea.height);
    }
    let new_dir = {x: nx-coll_obj.data.x, y: ny-coll_obj.data.y};
    
    // Does this "new_dir" take coll_obj through a wall?
    if (collides_with_wall(coll_obj, new_dir)){return false;}
    updates.push({id:coll_obj.id, x:nx, y:ny});
    return candidate_move(coll_obj, new_dir, updates);
  }
  return true;
}

Hooks.on('preUpdateToken', (token,data,move, t_id)=>{  
  // Before movement, validate wether move can actually go through.
  let nx = (hasProperty(data, 'x'))?(data.x):(token.data.x);
  let ny = (hasProperty(data, 'y'))?(data.y):(token.data.y);
  let direction = {x:nx-token.data.x, y: ny-token.data.y};
  let tok=canvas.tokens.get(token.id);

  let token_after_move = {data:{id:token.id,
                              x: nx, 
                              y: ny},
                          hitArea: tok.hitArea,
                          id:token.id
                        };
  let updates = [];
  valid = candidate_move(token_after_move, direction, updates);
  if (valid){
    // This move is valid. Execute our updates as GM
    pushable_socket.executeAsGM("moveAsGM",updates);
  }
  return valid;
});





// Hook into the token config render
Hooks.on("renderTokenConfig", (app, html) => {
  // Create a new form group
  const formGroup = document.createElement("div");
  formGroup.classList.add("form-group");

  // Create a label for this setting
  const label = document.createElement("label");
  label.textContent = "Pushable";
  formGroup.prepend(label);

  // Create a form fields container
  const formFields = document.createElement("div");
  formGroup.classList.add("form-fields");
  formGroup.append(formFields);

  // Create a text input box
  const input = document.createElement("input");
  input.name = "flags.pushable.isPushable";
  input.type = "checkbox";
  formFields.append(input);
  
  // Insert the flags current value into the input box
  //input.value = app.object.getFlag("pushable", "isPushable");//dis not workie
  if ((app.object.data.flags.pushable)&&(app.object.data.flags.pushable.isPushable)){ input.checked="true"; } //lets take the long way around
  
  // Add the form group to the bottom of the Identity tab
  html[0].querySelector("div[data-tab='character']").append(formGroup);

  // Set the apps height correctly
  app.setPosition();
});

