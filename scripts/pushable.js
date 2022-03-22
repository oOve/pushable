
//*
// debug, copypaste stuff
if (window.my_d){ Hooks.off('updateToken', window.my_d);}
if (window.my_rtc){Hooks.off("renderTokenConfig", window.my_rtc);}
if (window.my_preupdatehook){ Hooks.off('preUpdateToken', window.my_preupdatehook);}

socket = socketlib.registerModule("pushable");	
socket.register("moveAsGM", doMoveAsGM);
// */

let socket;
Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule("pushable");	
	socket.register("moveAsGM", doMoveAsGM);
});

function doMoveAsGM(token, direction){
  check_update_chain(token, direction, true);
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

window.my_preupdatehook = Hooks.on('preUpdateToken', (token,data,move, t_id)=>{
  let dx = ((hasProperty(data, 'x'))?data.x: token.data.x) - token.data.x;
  let dy = ((hasProperty(data, 'y'))?data.y: token.data.y) - token.data.y;
  let direction = {x:dx, y:dy};
  let coll_obj = find_collision(token);
  let valid = true;
  if (coll_obj){
    valid = check_update_chain(token, direction, false);
    if(valid){
      socket.executeAsGM("moveAsGM", coll_obj, direction);
    }    
  }
  return valid;
});


/*
window.my_d = Hooks.on('updateToken', (token,data,move)=>{
    // Do nothing unless we are the DM.
    if (! game.users.current.isGM ) return true;

    console.log('----------------------------------------------');
    console.log(token);
    console.log(data);
    console.log(move);
    console.log(token.data.x);
    

    // Get latest change in history
    let last = canvas.tokens.history.last().data[0];
    // Lets assume last is the right one (test is this assumption is always right)
    console.log(last);
    console.log(token);    

    let dx = token.data.x - last.x;
    let dy = token.data.y - last.y;
    let sz = canvas.scene.dimensions.size;
    let sz2 = sz/2;
    // Since the token movement might be looong (drag and drop)
    // lets constrain the moveable's movement to only one gridcell
    if(dx>0){dx=sz;}
    if(dx<0){dx=-sz;}
    if(dy>0){dy=sz;}
    if(dy<0){dy=-sz;}

    let diff = {x:dx, y:dy};
    
    let coll_obj = find_collision(token);
    if (coll_obj){
      let valid = check_update_chain(coll_obj, diff, true);    
      if (!valid){
        canvas.tokens.undoHistory();
      }
    }

});
*/



// Hook into the token config render
window.my_rtc = Hooks.on("renderTokenConfig", (app, html) => {
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

