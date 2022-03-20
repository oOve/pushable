 
 
Hooks.on('updateToken', (token,data,move)=>{
    // Do nothing unless we are the DM.
    if (! game.users.current.isGM ) return true;

    


});


/* Sadly this only works if the DM is the one moving the tokens.
Hooks.on('preUpdateToken', (token,data,move)=>{
  
    if ( (data.x||data.y) ){// This is a move action
      let previous_pos = {x:token.data.x, 
                          y:token.data.y};
      let new_pos = duplicate(previous_pos);
      if (data.x){new_pos.x=data.x;}
      if (data.y){new_pos.y=data.y;}
      
      // console.log("Actual move action");
     
      for (let tok of canvas.scene.data.tokens) {
        if (tok.data.name.endsWith(' moveable')) {
          // found moveable token.
          if ((tok.data.x==new_pos.x)&&(tok.data.y==new_pos.y)){
            // console.log("Collision");
            // console.log(tok);
            let dx = (new_pos.x - previous_pos.x);
            let dy = (new_pos.y - previous_pos.y);
            let sz = canvas.scene.dimensions.size;
            let sz2 = sz/2;
            // Since the token movement might be looong (drag and drop)
            // lets constrain the moveable's movement to only one gridcell
            if(dx>0){dx=sz;}
            if(dx<0){dx=-sz;}
            if(dy>0){dy=sz;}
            if(dy<0){dy=-sz;}
            
            // The desired movement of tok is:
            let r = new Ray( {x: tok.data.x + sz2, y: tok.data.y+sz2},
                             {x: tok.data.x+dx+sz2, y: tok.data.y+dy+sz2} );
  
            // Check if that movement is "legal"
            let legal = !canvas.walls.checkCollision(r);
            console.log("Checking collision on ray was legal:" + legal);
            console.log(r);
            // Stop current movement if not legal
            if (!legal) return false;
            tok.update({x: tok.data.x + dx,
                        y: tok.data.y + dy });
          }
        }
      }
      
    }
  
  });
*/

