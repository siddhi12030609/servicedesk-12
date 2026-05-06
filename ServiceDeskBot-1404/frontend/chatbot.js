const API = "http://127.0.0.1:8000";

/* ---------------- BOT TOGGLE ---------------- */

function toggleChat(){
    const chat = document.getElementById("chatWindow");
    if(!chat) return;

    if(chat.style.display === "block"){
        chat.style.display = "none";
    }else{
        chat.style.display = "block";
    }
}


/* ---------------- SHOW BOT AFTER LOGIN ---------------- */

document.addEventListener("DOMContentLoaded", () => {

    const icon = document.getElementById("chatIcon");
    if(!icon) return;

    // hide bot initially
    icon.style.display = "none";

    setInterval(() => {

        const adminDash = document.getElementById("adminDashboard");
        const userDash = document.getElementById("userDashboard");

        if(
            (adminDash && adminDash.style.display !== "none") ||
            (userDash && userDash.style.display !== "none")
        ){
            icon.style.display = "flex";
        }

    },500);

});


/* ---------------- BOT ACTIONS ---------------- */

async function executeChat(){

    const action = document.getElementById("chatMenu").value;
    const chat = document.getElementById("chatMessages");

    if(!action) return;


    if(action === "createRequest"){

        const email = document.getElementById("botEmail").value;
        const role = document.getElementById("botRole").value;
        const type = document.getElementById("botType").value;

        if(!email){
            chat.innerHTML += "<div><b>Bot:</b> Please enter email</div>";
            return;
        }

        const res = await fetch(API + "/request",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                user_email: email,
                role: role,
                type: type
            })
        });

        if(res.ok){
            chat.innerHTML += `<div><b>Bot:</b> Request created for ${email}</div>`;
        }else{
            chat.innerHTML += `<div><b>Bot:</b> Failed to create request</div>`;
        }
    }


    if(action === "analytics"){

        const res = await fetch(API + "/admin-stats");
        const data = await res.json();

        chat.innerHTML += `
        <div>
        Pending: ${data.pending_requests}<br>
        Total Users: ${data.total_users}<br>
        Active Users: ${data.active_users}<br>
        Offboarded Users: ${data.offboarded_users}
        </div>`;
    }


    if(action === "users"){

        const res = await fetch(API + "/users");
        const users = await res.json();

        chat.innerHTML += `
        <div><b>Users</b><br>
        ${users.map(u => u.email).join("<br>")}
        </div>`;
    }


    if(action === "pending"){

        const res = await fetch(API + "/admin-stats");
        const data = await res.json();

        chat.innerHTML += `<div>Pending Requests: ${data.pending_requests}</div>`;
    }



// 🔴 DELETE USER FLOW
 if(chatState === "ask_delete_email"){

  addMessage("You", msg);

  const value = msg.trim();

  addMessage("Bot", "⏳ Deleting user...");

  await deleteUser(value);

  chatState = null;
  input.value = "";

  return; // 🔥 THIS LINE IS CRITICAL
}


}