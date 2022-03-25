


let pushable_socket;
Hooks.once("socketlib.ready", () => {
	pushable_socket = socketlib.registerModule("pushable");	
	pushable_socket.register("moveAsGM", doMoveAsGM);
});

function doMoveAsGM(token, direction){
  let coll_obj = find_collision(token);
  check_update_chain(coll_obj, direction, true);
}

function find_collision(token){
  for (let tok of canvas.tokens.placeables){
    if (tok.data.flags.pushable &&
        tok.data.flags.pushable.isPushable &&
        tok.id != token.id &&
        token.data.x == tok.data.x &&
        token.data.y == tok.data.y )
    {
      return tok;      
    }
  }
  return null;
}

function check_update_chain(token, direction, do_updates){
  let sz = canvas.scene.dimensions.size;
  let sz2 = sz/2;

  let ray = new Ray({x:token.data.x + sz2, y: token.data.y + sz2},
                    {x:token.data.x+direction.x + sz2, y:token.data.y+direction.y + sz2});
  let wall_coll = canvas.walls.checkCollision(ray);
  if (wall_coll){return false;}
  
  let pot_col = {data:{id:token.id, 
                       x: token.data.x+direction.x, 
                       y: token.data.y+direction.y}};
  let coll_obj = find_collision(pot_col);
  let valid = true;
  if (coll_obj){
    valid = check_update_chain(coll_obj, direction, do_updates);        
  }  
  if (valid && do_updates){
    token.document.update( {x: token.x + direction.x,  y: token.y + direction.y});
  } 
  return valid;
}


Hooks.on('preUpdateToken', (token,data,move, t_id)=>{  
  // Validate wether move can take place
  let dx = ((hasProperty(data, 'x'))?data.x: token.data.x) - token.data.x;
  let dy = ((hasProperty(data, 'y'))?data.y: token.data.y) - token.data.y;
  let direction = {x:dx, y:dy};  
  let pot_col = {data:{id:token.id, 
                       x: token.data.x+direction.x, 
                       y: token.data.y+direction.y}};
  
  
  
  let coll_obj = find_collision(pot_col);
  let valid = true;
  if (coll_obj){
    valid = check_update_chain(coll_obj, direction, false);
    if(valid){      
      pushable_socket.executeAsGM("moveAsGM", pot_col, direction);
    }
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

