function createRequest(){

let title = document.getElementById("title").value
let description = document.getElementById("description").value

fetch(API + "/create-request",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

title:title,
description:description

})

})

.then(res=>res.json())
.then(data=>{

alert("Request Created")

loadRequests()
loadNotifications()

})

}


window.showSection = function(section) {

  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("requestSection").classList.add("hidden");
  document.getElementById("userSection").classList.add("hidden");

  if (section === "dashboard") {
    document.getElementById("dashboardSection").classList.remove("hidden");
  }

  if (section === "requests") {
    document.getElementById("requestSection").classList.remove("hidden");
    loadRequests();
  }

  if (section === "users") {
    document.getElementById("userSection").classList.remove("hidden");
    loadUsers();
  }
}


function cancelRequest(id){

fetch(API + "/cancel-request/"+id,{
method:"DELETE"
})

.then(res=>res.json())

.then(data=>{

alert("Request Cancelled")

loadRequests()

})

}



function loadNotifications(){

fetch(API + "/notifications")

.then(res=>res.json())

.then(data=>{

let list = document.getElementById("notifications")

list.innerHTML=""

data.forEach(n=>{

let li = document.createElement("li")

li.textContent = n.message

list.appendChild(li)

})

})

}



function openChatbot(){

let message = prompt("Ask Service Desk Bot")

fetch(API + "/chatbot",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

message:message

})

})

.then(res=>res.json())

.then(data=>{

alert(data.reply)

})

}



loadRequests()
loadNotifications()